# Vector Store — n8n In-Memory Vector Store

**Replaces:** the pgvector chunk table + `match_policy_chunks` function that would otherwise live in `supabase-schema.sql` — per the implementation-specs skill's own guidance: "If the vector DB is not Supabase, replace the chunk table and function with `docs/specs/vector-store.md`."
**Implements:** FR-04, FR-08, FR-09 (tenant isolation guardrail)
**Node type:** `@n8n/n8n-nodes-langchain.vectorStoreInMemory`, used twice — once in `insert` mode (Flow 1) and once in `retrieve-as-tool` mode (Flow 2) — exactly as in the reference workflow (`Simple Vector Store` / `Simple Vector Store1`).

---

## Decision: n8n's in-memory store, per-`policy_id` key

**[User decision, stated plainly with its tradeoffs]** The reference workflow uses a single hardcoded `memoryKey: "vector_store_key"` shared by every document ever ingested — fine for a single-document course demo, but in a multi-policy, multi-user product it means **ingesting Policy B would wipe out Policy A's chunks** (the insert node's `clearStore: true` clears whatever store that key points to). This spec's one required change from the literal reference: **`memoryKey` is set dynamically to the current `policy_id`** on both the insert node (Flow 1) and the retrieve-as-tool node (Flow 2), e.g. `={{ $json.policy_id }}`.

This single change gets three things for free:
1. **Idempotency** — re-ingesting a policy clears and replaces only that policy's own store.
2. **Tenant isolation** — a retrieval call bound to policy A's key can never see policy B's chunks, because they are not in the same store at all (stronger than a shared-table-plus-`WHERE`-clause design, which depends on the filter always being applied correctly).
3. **No new infrastructure** — nothing beyond what the reference template already does, per the user's explicit "just use n8n's in-memory store" instruction.

## What this store is NOT

- **Not durable.** It lives in the n8n process's memory. An n8n restart (deploy, crash, scheduled maintenance) loses every policy's chunks. There is no backup, no disk persistence, no replication.
- **Not cross-instance.** If n8n ever runs as more than one worker process/pod, each one has its own separate in-memory store — a chat request handled by worker B will not see chunks inserted by worker A. **This design assumes a single n8n process.** If horizontal scaling is ever needed, this is the first thing that breaks, and the fix is swapping this node for a persistent vector store — the per-`policy_id` key convention established here would carry over unchanged to that migration.
- **Not queryable outside n8n.** The app cannot ask "does policy X have chunks" directly — it only knows a policy is `ready` because n8n told it so via the direct MongoDB write (`docs/specs/n8n-ingestion-workflow.md`).

## Operations

### Insert (Flow 1, node `Simple Vector Store`, `mode: insert`)
- **Input:** chunked, embedded documents from the `Token Splitter` → `Embeddings OpenAI` chain.
- **Parameters:** `memoryKey: ={{ $json.policy_id }}`, `clearStore: true`.
- **Metadata attached per chunk:** `page_number`, `chunk_index`, `chunk_type` (`text`|`table`), `document_id` — attached via the `Binary Input Loader`'s metadata options, extended with these PolicySaathi-specific fields beyond the reference's generic `document_type`/`chunk_type` example values — **plus, for exact-sentence citation (see `docs/specs/n8n-rag-workflow.md` and `docs/specs/citation-verifier.md`):**
  - `content` includes the inline `[LINE l]` markers from ingestion node 4a, uninterrupted — the chunk's stored text is the marked text, not a stripped version of it.
  - `lines: [{ line_number, text, bounding_box }]` — the per-line breakdown (with OCR bounding box) for exactly the lines this chunk spans, sliced from ingestion node 4a's page-level lookup table.
  - `chunk_type: "table"` chunks carry a single `bounding_box` for the whole table region instead of a `lines[]` array, since a table cell isn't a "line" in the same sense.
- **Behavior:** because `clearStore: true`, every insert for a given `policy_id` discards that policy's previous chunks first — this is both the idempotency mechanism and the only way to "update" a policy's chunks (there is no partial update).

### Why line/bounding-box geometry doesn't need its own durable store

The geometry above lives only inside the (non-durable) in-memory chunk, same as everything else in this store — there is no separate "page geometry" collection in MongoDB. This is sufficient because geometry is only ever *read* at two moments, both of which copy it out into a durable record immediately: when `insurance_policy_agent` cites a line, the `Citation Verifier` resolves that citation's `bounding_box` from the chunk it just retrieved and writes it straight into `chat_messages.citations` (durable, MongoDB); when Snapshot Extraction reports a term's source line, ingestion node 7 resolves its `bounding_box` the same way and writes it into `snapshot_terms` (durable, MongoDB) — see `docs/specs/n8n-ingestion-workflow.md`. A citation or Snapshot term already shown to a user remains fully navigable even if the vector store is later lost to a restart; only a *new* question about a policy whose store was lost falls back to "I can't find this in your documents," per the existing non-durability tradeoff — geometry doesn't add a new failure mode on top of that.

### Retrieve-as-tool (Flow 2, node `Simple Vector Store1`, `mode: retrieve-as-tool`)
- **Parameters:** `memoryKey: ={{ $json.policy_id }}` — **bound from the authenticated webhook input, never from the LLM's tool-call arguments** (the guardrail: retrieval is always scoped to the policy the request is actually for).
- **`topK`:** reference value `20`, carried over as a default; `docs/engineering/implementation-specs.md`'s open items flags this for tuning down once real usage data exists — 20 is generous for a single policy's modest chunk count but is not yet validated against PolicySaathi's actual chunk sizes.
- **Tool description:** per the reference, instructs the calling agent (`insurance_policy_agent`) to search with specific, keyword-rich queries, one concept at a time, and to rephrase and search again on a weak first result. **Additional instruction beyond the reference:** each returned chunk's text includes inline `[Page X][Line Y]` markers before every line — the agent must cite the marker of the specific line it draws a fact from, not just the page, per `docs/specs/n8n-rag-workflow.md`'s updated prompt.
- **If `memoryKey` (i.e. the policy) has no store yet** (ingestion never ran, or the store was lost to a restart): the retrieval returns empty, and `insurance_policy_agent` must respond "I can't find this in your documents" — **indistinguishable, from the chat answer's perspective, from a genuine "not found."** This is an accepted consequence of the non-durability tradeoff above; the user experience is a safe failure mode (never a wrong guess), just not a maximally informative one ("your policy needs to be re-processed" would be more honest but requires the app to track ingestion state separately and isn't built in this version).

### Delete (triggered by policy deletion, `docs/specs/data-deletion.md`)
There is no first-class "delete by key" exposed on this node in retrieve/insert mode alone — the practical mechanism is: call the ingestion flow's insert path with an **empty** chunk set and the same `policy_id` key, relying on `clearStore: true` to wipe it. *(Flagged: confirm this actually clears the store with zero incoming items, or whether a dedicated clear operation needs to be added to the workflow — this is a detail to verify once the node is actually built in `/n8n-workflows`, not something verifiable from the spec alone.)*

## Acceptance criteria

```
Given policy A is ingested, then policy B is ingested
When a chat question is asked against policy A
Then policy A's chunks are still present and correct — policy B's ingestion did not clear them (memoryKey isolation holds)

Given policy A is re-ingested (e.g. a failed document was retried)
When the insert node runs with memoryKey = policy A's id
Then only policy A's previous chunks are cleared before the new set is inserted

Given a chat request for policy A's user asking about policy B (a crafted/incorrect policy_id)
When Flow 2 binds memoryKey from the webhook's own policy_id field
Then retrieval only ever touches the store for the policy_id actually in the authenticated request — there is no code path where the LLM's own output can change which store is queried

Given n8n restarts between ingestion and the user's next chat message
When the user asks a question
Then the answer is "I can't find this in your documents" (safe), not a crash and not another policy's content

Given a retrieved chunk whose content includes "[Page 14][Line 3] Room rent is capped at 1% of the Sum Insured per day."
When insurance_policy_agent uses that line in its answer
Then the Citation Verifier can resolve (page 14, line 3) to that chunk's bounding_box for line 3, because the chunk's lines[] metadata was attached at insert time and never stripped

Given a citation already shown to a user and persisted to chat_messages
When the n8n process later restarts and that policy's vector-store partition is lost
Then the already-persisted citation's bounding_box still renders correctly in the viewer — only a new question about that policy is affected
```
