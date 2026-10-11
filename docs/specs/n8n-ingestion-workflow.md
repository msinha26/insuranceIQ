# n8n Flow 1 — `document_ingestion`

**Implements:** FR-03, FR-04, FR-05, FR-06, FR-07
**Lives in:** the single n8n workflow `AgenticRAGWorkflow-Week-4` (see `CLAUDE.md`), alongside Flow 2 (`docs/specs/n8n-rag-workflow.md`).
**Data layer:** MongoDB (direct writes) + n8n's in-memory vector store (`docs/specs/vector-store.md`). **No Supabase, no Postgres.**

---

## Webhook

- **Path:** `document_ingestion` · **Method:** `POST` · **Response mode:** `responseNode` (matches the reference's `Webhook` node exactly).
- **Authentication:** custom header `X-PolicySaathi-Secret` (n8n Header Auth credential `PolicySaathi Webhook Secret`). Missing/mismatched → `401`, no further nodes run.

### Request JSON
```json
{
  "user_id": "3f1a2b4c-...",
  "policy_id": "9c8d7e6f-...",
  "document_id": "1a2b3c4d-...",
  "file_base64": "<base64-encoded PDF bytes>",
  "file_type": "pdf"
}
```
The file travels as a base64 field in the request body, not a URL — n8n never calls back into the app to fetch it. This is why uploads are restricted to PDF only, 5 MB max (`docs/specs/upload-api.md`): base64 inflates size by ~33%, so the whole request body stays well under typical webhook payload limits with no separate fetch step and no dependency on the app being network-reachable from n8n (this is what breaks in local dev, where n8n Cloud cannot reach `localhost`).

### Immediate response
```json
{ "accepted": true, "document_id": "1a2b3c4d-..." }
```
HTTP `202`, via `Respond to Webhook` — matches the reference exactly, fired right after the webhook node.

### Final state (written directly to MongoDB, not returned via any callback)
```json
{
  "status": "ready",
  "chunk_count": 42,
  "unreadable_pages": [12, 13],
  "doc_class": "schedule",
  "ocr_quality_flags": [{ "page": 7, "quality_score": 0.52, "label": "low" }]
}
```

---

## Nodes, in order

| # | Node | Type | Key settings |
|---|---|---|---|
| 1 | `Webhook` | `n8n-nodes-base.webhook` | `httpMethod: POST`, `path: document_ingestion`, `responseMode: responseNode`, Header Auth credential |
| 2 | `Respond to Webhook` | `n8n-nodes-base.respondToWebhook` | `{"accepted": true, "document_id": "={{$json.document_id}}"}`, status `202` |
| 3 | `Decode Base64 File` | `n8n-nodes-base.convertToFile` | operation `toBinary`, source property `file_base64` — turns the incoming base64 JSON field into binary data for node 4, with no outbound HTTP call |
| 4 | `OCR — Azure Document Intelligence` *(addition, not in the reference)* | `n8n-nodes-base.httpRequest` | Layout model endpoint. Captures, per page: full text, table bounding boxes, **and the per-line `lines[]` array Azure's Layout model already returns** — each line's text plus its `polygon`/bounding box on the page. This per-line geometry is what makes exact-sentence citation (below) possible; it costs nothing extra since Azure returns it as part of the normal Layout response. **[DEFAULT]** vendor per `docs/specs/ocr-quality-scoring.md` |
| 4a | `Build Line-Marked Text` *(addition)* | `n8n-nodes-base.code` | Flattens node 4's per-page `lines[]` into the extraction text with inline markers: `[DOC n][PAGE p][LINE l] <line text>` for every line, `l` resetting to 1 at the start of each page. This marked text is what nodes 7–9 consume — the `[LINE l]` marker is the mechanism that lets both Snapshot Extraction and chunking cite an exact line, not just a page. A parallel lookup table `{page_number, line_number} → {text, bounding_box}` is carried forward in the execution for nodes 7 and 9 to attach to their own outputs |
| 5 | `Per-Page OCR Quality Score` *(addition)* | `n8n-nodes-base.code` | Per `docs/specs/ocr-quality-scoring.md`'s formula and thresholds |
| 6 | `Document Classifier` *(addition)* | `@n8n/n8n-nodes-langchain.textClassifier` | Categories: `schedule, wording, group_certificate, endorsement, other` (FR-06) |
| 7 | `Snapshot Extraction` *(addition)* | `@n8n/n8n-nodes-langchain.agent` | Large tier, temperature `0.1`, full `[DOC n][PAGE p][LINE l]`-marked text from node 4a. Instructed to report the **starting line number** of each term's `source_sentence`, not just the page — full prompt in `docs/specs/policy-snapshot.md`. The node then resolves that `(page, line)` against node 4a's lookup table to attach `bounding_box` before node 12 writes it |
| 8 | `Binary Input Loader` | `@n8n/n8n-nodes-langchain.documentBinaryInputLoader` | `loader: pdfLoader`, fed the **line-marked text from node 4a**, not raw OCR text; metadata values extended beyond the reference's generic `document_type`/`chunk_type` example to carry `document_id`, `page_number` per chunk |
| 9 | `Token Splitter` | `@n8n/n8n-nodes-langchain.textSplitterTokenSplitter` | **[DEFAULT, tuned from the reference's generic `chunkOverlap: 100`]** `chunkSize: 500`, `chunkOverlap: 75`; custom logic keeps a chunk within one page, extracts detected table regions as one atomic `chunk_type: "table"` chunk, and — critically — **preserves the inline `[LINE l]` markers inside each chunk's stored `content`** (the splitter chunks the marked text, it does not strip the markers). Each chunk's metadata additionally carries a `lines: [{line_number, text, bounding_box}]` array (sliced from node 4a's lookup table for exactly the lines that chunk spans) and, for `chunk_type: "table"` chunks, a single `bounding_box` for the whole table region instead of per-line boxes |
| 10 | `Embeddings OpenAI` | `@n8n/n8n-nodes-langchain.embeddingsOpenAi` | model `text-embedding-3-small` — embeds the chunk's `content` **including** its inline `[LINE l]` markers, so retrieval-time similarity isn't affected by markers appearing in every chunk uniformly; matches the reference node type exactly |
| 11 | `Simple Vector Store` | `@n8n/n8n-nodes-langchain.vectorStoreInMemory` | `mode: insert`, **`memoryKey: ={{$json.policy_id}}`** (the one required change from the reference's hardcoded key — see `docs/specs/vector-store.md`), `clearStore: true`. Each inserted record carries the `lines[]`/`bounding_box` metadata from node 9 alongside the existing `page_number`/`chunk_index`/`chunk_type`/`document_id` fields |
| 12 | `Write to MongoDB` *(addition)* | `n8n-nodes-base.mongoDb` | Update/upsert operation against `documents` (status, `doc_class`, `ocr_quality`, `unreadable_pages`), `snapshot_terms` (insert from node 7's output, **now including `line_number` and `bounding_box` per term**), and `policies.status` — direct write using n8n's own MongoDB credential, the same trust pattern already used for `generalQuestionsCollection`. **Match by the `id` string field, not `_id`:** n8n's native MongoDB node's "Update" operation filters by exact BSON type with no automatic string-to-ObjectId casting, so a string `_id` value never matches the ObjectId-typed `_id` the app writes — it reports success while matching zero documents. Both `documents` and `policies` carry a denormalized string `id` field (hex copy of `_id`, unique-indexed) for exactly this purpose; set the Update Key to `id`, not `_id` |

---

## Failure and retry behaviour

- Nodes 4 (OCR), 7 (Snapshot), 10 (Embeddings) each retry 3× with backoff before that step is treated as failed.
- A single unreadable page does not fail the whole document — it's recorded in `unreadable_pages`.
- If Snapshot Extraction (7) exhausts retries, chunking/embedding/insert still proceed (chat still works) and `documents.status` is written as `"failed"` with `error: "snapshot_extraction_failed"`.
- If OCR (4) fails entirely, `documents.status` is `"failed"`, `error: "ocr_failed"`, and the uploaded file is **not** deleted from GridFS.
- Node 12's MongoDB write itself retrying is important — if it fails after everything else succeeded, the app has no other way to learn the result (there is no callback route to retry against); treat MongoDB write failures here as high-severity for Stage 7 monitoring.

## Idempotency rule

Re-running this flow for the same `document_id`/`policy_id`: node 11's `clearStore: true` with a `memoryKey` bound to `policy_id` clears and replaces only that policy's chunks (not a global clear, per `docs/specs/vector-store.md`); node 12's MongoDB writes are upserts keyed on `document_id`/`policy_id`, not inserts, so re-running never creates duplicate `documents`/`snapshot_terms` records.

## Credentials required (n8n credential store)

| Credential name | Used by |
|---|---|
| `PolicySaathi Webhook Secret` | Node 1 |
| `Azure Document Intelligence` | Node 4 |
| `OpenAI (PolicySaathi)` | Nodes 7, 10 |
| `PolicySaathi MongoDB` | Node 12 — same deployment as `generalQuestionsCollection`'s credential, different collections |

---

## Acceptance tests (given/when/then)

```
Given a 10-page PDF policy with a text layer on every page
When document_ingestion is called
Then documents.status becomes "ready", chunk_count > 0, and unreadable_pages is empty

Given a phone photo of page 7 too blurry for OCR
When document_ingestion processes that document
Then page 7 appears in unreadable_pages and the document otherwise completes normally

Given document_id X was already ingested once
When document_ingestion is called again for document_id X with policy_id P
Then the in-memory vector store's P-keyed partition contains only the fresh chunk set, and the documents/snapshot_terms MongoDB documents are updated in place, not duplicated

Given policy A and policy B are ingested back to back
When policy B's insert runs (memoryKey = B's policy_id, clearStore: true)
Then policy A's chunks (stored under A's own memoryKey) are untouched

Given the OCR vendor call times out 3 times in a row
When document_ingestion processes that document
Then documents.status is "failed", error is "ocr_failed", and the GridFS file is not deleted

Given a page with 40 OCR-detected lines
When node 4a builds the line-marked text
Then every line carries a unique [LINE l] marker (l = 1..40) that survives unchanged through chunking into the chunk actually stored in the vector store

Given a Snapshot term whose source sentence is the 12th line on page 3
When Snapshot Extraction (node 7) reports it
Then the written snapshot_terms document has page_number 3, line_number 12, and a bounding_box resolved from node 4a's lookup table — not just a page number
```
