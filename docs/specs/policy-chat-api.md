# Policy Chat API

**Implements:** US-005, FR-09, FR-12
**API routes:** `POST /api/chat/sessions`, `POST /api/chat/sessions/[id]/messages`, `GET /api/chat/sessions`
**Calls:** n8n Flow 2 (`document_retrieval`) — see `docs/specs/n8n-rag-workflow.md`

---

## `POST /api/chat/sessions`

**Request:** `{ "policy_id": "..." }`
**Behavior:** verify the policy's `user_id` matches the session and `policies.status == "ready"` (else `409 not_ready`); insert a `chat_sessions` document; return `{ "session_id": "..." }`. One session per policy is typical but not enforced — a user may start multiple sessions for the same policy *(default; the PRD doesn't specify single-vs-multi-session-per-policy, flagged)*.

## `POST /api/chat/sessions/[id]/messages`

**Request:** `{ "message": "Is room rent capped on my plan?" }`
**Validation:** message length 1–2000 characters *(default cap, confirm)*; session's `user_id` matches the authenticated user.

**Behavior:**
1. Re-check the session's policy still exists (no FK to rely on in MongoDB — see Edge cases).
2. Insert the user's turn into `chat_messages` (`role: "user"`).
3. Load the last 20 `chat_messages` documents for this session (oldest-to-newest) to build `recent_turns`.
4. Call n8n's `document_retrieval` webhook with `{user_id, policy_id, question: message, recent_turns}` (`src/lib/n8n/retrieval.ts`).
5. On success, insert the assistant's turn into `chat_messages` (`role: "assistant"`, `route`, `citations` from the n8n response).
6. Return the full n8n response to the frontend: `{ answer, citations, route, source_label, not_found, safety_flag }`.

**Streaming:** if n8n's streaming mode is enabled (per the latency note in `docs/specs/n8n-rag-workflow.md`), this route proxies the response as a Node.js `ReadableStream` rather than buffering the whole JSON — implemented as a Next.js Route Handler (not Edge runtime, to support Node streaming reliably per `engineering-doc.md` §7.2).

**On n8n failure (timeout/5xx):** return `503 { "code": "upstream_unavailable" }`; do **not** insert an assistant `chat_messages` document for a failed call (only real exchanges are persisted); do **not** log `message` content in the error (Section 11 guardrail).

## `GET /api/chat/sessions`

Plain ownership-checked list (`user_id` in the query filter — no RLS backstop exists in MongoDB), grouped/sortable by policy and recency, for the history feature (`docs/engineering/implementation-specs.md` spec #8).

## Conversation memory

The app, not n8n, is responsible for trimming to the last 20 turns before sending `recent_turns` — n8n's `Simple Memory` node (per `n8n-rag-workflow.md`) is a secondary safeguard inside the flow, not the sole mechanism, since the app already controls exactly what history is sent per the PRD's "last 20 turns passed per turn, older turns summarized" requirement. **Summarization of turns beyond 20 is not implemented in this spec** — turns beyond the last 20 are simply not sent, which satisfies "last 20 turns" but not literally "older turns summarized"; flagged as a simplification to confirm, since full summarization needs its own LLM call and prompt, which would be a new AI Architecture component not yet speced.

## Edge cases

- A user asks a question in a session for a policy that was deleted since the session started → MongoDB has no FK to catch this automatically (per `docs/specs/data-deletion.md`'s edge case), so step 1 above (explicit existence check) is the only guard — without it, the route would happily call n8n for a nonexistent policy and could resurrect an orphaned message on return.
- Two messages sent in rapid succession (double-tap) → each gets its own `chat_messages` document and its own `document_retrieval` call; no de-duplication at MVP — *(flagged: consider a client-side disable-while-pending guard instead of server-side de-dup, since legitimate rapid follow-ups are a normal usage pattern)*.
- `not_found: true` responses are still persisted to `chat_messages` like any other answer — a "not found" is a complete, valid exchange, not an error to retry.

## Acceptance criteria

```
Given a ready policy and an authenticated user
When POST /api/chat/sessions is called
Then a chat_sessions document is created and returned

Given an existing session and a question with a document-grounded answer
When POST /api/chat/sessions/[id]/messages is called
Then both the user and assistant chat_messages documents are inserted, and the assistant document's citations match the response's citations

Given n8n's document_retrieval call times out after all retries
When POST /api/chat/sessions/[id]/messages is called
Then the route returns 503 upstream_unavailable, no assistant chat_messages document is created, and no raw message text appears in the server error log

Given a conversation with 25 prior turns
When the 26th message is sent
Then recent_turns sent to n8n contains only the most recent 20
```
