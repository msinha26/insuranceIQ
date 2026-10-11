# MongoDB Schema

**Replaces:** `docs/specs/supabase-schema.sql` (Supabase is not used in this project — see `docs/engineering/engineering-doc.md`'s architecture note).
**Implements:** FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-14, FR-15, FR-16, US-001–US-016

One MongoDB deployment, two roles: the pre-existing `generalQuestionsCollection` (off-topic Q&A, SME/ops-managed, read-only from this app) and the new app collections below (written by the Next.js app and, for ingestion-derived fields, by n8n directly using its own MongoDB credential).

---

## Collections

### `users`
```json
{
  "_id": "ObjectId",
  "phone": "string, unique, E.164",
  "age_confirmed_18_plus": "boolean",
  "created_at": "Date"
}
```
Index: `{ phone: 1 }, { unique: true }`

### `otp_codes`
```json
{
  "_id": "ObjectId",
  "phone": "string",
  "code_hash": "string",      // bcrypt/argon2 hash of the 6-digit code, never stored plain
  "expires_at": "Date"
}
```
Index: `{ expires_at: 1 }, { expireAfterSeconds: 0 }` — a TTL index; MongoDB deletes the document automatically once `expires_at` passes, which is also how codes "expire" (no separate expiry check needed beyond "does the document still exist").

### `consents`
```json
{ "_id": "ObjectId", "user_id": "ObjectId", "version": "string", "accepted_at": "Date" }
```
Index: `{ user_id: 1, version: 1 }`

### `policies`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "policy_type": "individual|family_floater|group|top_up",
  "status": "processing|ready|failed",
  "created_at": "Date",
  "updated_at": "Date"
}
```
Index: `{ user_id: 1 }`

### `documents`
```json
{
  "_id": "ObjectId",
  "policy_id": "ObjectId",
  "gridfs_file_id": "ObjectId",
  "file_type": "pdf|jpg|png",
  "doc_class": "schedule|wording|group_certificate|endorsement|other|null",
  "ocr_quality": [{ "page": "int", "quality_score": "float", "label": "high|low|unreadable" }],
  "unreadable_pages": ["int"],
  "status": "processing|ready|failed",
  "error": "string|null",
  "created_at": "Date",
  "updated_at": "Date"
}
```
Index: `{ policy_id: 1 }`

### `snapshot_terms`
```json
{
  "_id": "ObjectId",
  "policy_id": "ObjectId",
  "term": "string",
  "value": "string|null",
  "page_number": "int|null",
  "line_number": "int|null",
  "bounding_box": "{ x, y, width, height }|null",
  "confidence": "float|null",
  "source_sentence": "string|null",
  "is_not_found": "boolean",
  "low_quality_source": "boolean"
}
```
`line_number`/`bounding_box` let the viewer navigate to the exact sentence, not just the page — resolved at ingestion time from the OCR line geometry captured in `docs/specs/n8n-ingestion-workflow.md` node 4a; see `docs/specs/policy-snapshot.md`.
Index: `{ policy_id: 1 }`

### `chat_sessions`
```json
{ "_id": "ObjectId", "policy_id": "ObjectId", "user_id": "ObjectId", "created_at": "Date" }
```
Index: `{ user_id: 1, policy_id: 1 }`

### `chat_messages`
```json
{
  "_id": "ObjectId",
  "session_id": "ObjectId",
  "role": "user|assistant",
  "content": "string",
  "route": "insurance_policy|claims_guide|both|general|null",
  "citations": [{ "page": "int", "line_number": "int|null", "bounding_box": "{ x, y, width, height }|null", "chunk_type": "text|table|null" }],
  "created_at": "Date"
}
```
`line_number`/`bounding_box` are populated for `insurance_policy`-sourced citations only (resolved by the Citation Verifier, `docs/specs/citation-verifier.md`) — a Playbook-sourced answer (`route: "claims_guide"`) has no page/line in the user's own document at all, so its "citation" is a Snowflake `ENTRY_ID`, carried in the answer text itself, not this array.
Index: `{ session_id: 1 }`

### `answer_feedback`
```json
{ "_id": "ObjectId", "message_id": "ObjectId", "user_id": "ObjectId", "is_positive": "boolean", "created_at": "Date" }
```
Index: `{ message_id: 1, user_id: 1 }, { unique: true }` — enables the upsert-on-repeat-tap behavior in `docs/specs/document-viewer-history-feedback.md`.

### `payments`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "razorpay_order_id": "string",
  "status": "pending|paid|failed",
  "amount_paise": "int",
  "plan": "hospital_pass|family_plan",
  "created_at": "Date",
  "updated_at": "Date"
}
```
Index: `{ razorpay_order_id: 1 }, { unique: true }`

### `rate_limit_events` (addition, Stage 4 — not in the original schema)
```json
{ "_id": "ObjectId", "key": "string", "created_at": "Date", "expires_at": "Date" }
```
Generic sliding-window rate limiter backing `src/lib/security/rate-limit.ts`. `key` is caller-defined (e.g. `otp_send:+91XXXXXXXXXX`); `expires_at` is computed per-insert as `created_at + windowSeconds`, which is what lets one TTL index serve any window length the caller asks for. Used first by the OTP-send rate limit (FR-01, 3 sends per phone per 15 minutes); reusable for any future rate-limited action without a schema change.
Index: `{ expires_at: 1 }, { expireAfterSeconds: 0 }`

### `generalQuestionsCollection` (pre-existing — do not create or modify from this app)
Matched by the n8n `generic_question_agent`'s own Mongo filter (`$fromAI('mongo_query_filter', ...)`). Its exact document shape is owned by whoever curates it (ops/SME) and is out of this spec's scope.

### GridFS (`fs.files` / `fs.chunks`)
Standard MongoDB GridFS buckets, default names. `documents.gridfs_file_id` references `fs.files._id`. GridFS is used (instead of a plain `Binary` field) specifically because policy files can be up to 20 MB, well past MongoDB's 16 MB single-document limit.

---

## Mandatory tenant-filter rule (replaces Postgres RLS)

**MongoDB has no row-level security.** Every query against a user-scoped collection (`policies`, `documents`, `snapshot_terms`, `chat_sessions`, `chat_messages`, `answer_feedback`, `payments`) issued by an API route **must** include `user_id` (directly, or via a `policy_id`/`session_id` already verified to belong to that `user_id` in the same request) in its filter document. There is no database-level backstop — a route that omits this filter is a data leak, full stop. `src/lib/security/tenant-filter.ts` (per `docs/engineering/implementation-specs.md`'s folder structure) should provide a single helper every route uses, so this rule is enforced in one place rather than re-implemented per route.

## Who writes what

- **The Next.js app** writes: `users`, `otp_codes`, `consents`, `policies` (create + delete), `chat_sessions`, `chat_messages`, `answer_feedback`, `payments`, GridFS uploads/deletes.
- **n8n (Flow 1)** writes directly: `documents` (status, `doc_class`, `ocr_quality`, `unreadable_pages`), `snapshot_terms`, `policies.status` — using its own MongoDB credential, the same direct-write trust pattern already used for `generalQuestionsCollection` in the reference workflow.
- **n8n (Flow 2)** only **reads** `generalQuestionsCollection` — it never writes to any app collection.

## Deletion (no cascades — see `docs/specs/data-deletion.md` for the full sequence)

Deleting a policy requires explicit, ordered deletes against `documents`, `snapshot_terms`, `chat_sessions` (and their `chat_messages`/`answer_feedback`), the policy's GridFS files, and a signal to n8n to clear that policy's in-memory vector-store partition — MongoDB will not do any of this automatically.

## Acceptance criteria

```
Given a new user completes OTP sign-in
When the users collection is checked
Then exactly one document exists for that phone number, never duplicated across repeat sign-ins

Given an OTP code 10 minutes old with a 5-minute TTL
When otp_codes is queried
Then the document no longer exists (MongoDB's TTL index removed it)

Given a policy deletion
When every write this spec assigns to the operation completes
Then zero documents remain in documents/snapshot_terms/chat_sessions/chat_messages/answer_feedback referencing that policy_id, and its GridFS files are gone

Given any API route reading a user-scoped collection
When its query is inspected
Then the filter includes user_id (or a pre-verified owning id) — never a bare _id lookup with no ownership check
```
