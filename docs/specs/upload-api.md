# Upload API

**Implements:** US-002, FR-03, FR-04
**API routes:** `POST /api/policies`, `GET /api/policies`, `GET /api/policies/[id]`, `GET /api/policies/[id]/documents/[docId]/file`
**Calls:** n8n Flow 1 (`document_ingestion`) — see `docs/specs/n8n-ingestion-workflow.md`
**Data layer:** MongoDB + GridFS. **No Supabase Storage, no signed URLs.**

---

## `POST /api/policies`

**Request:** `multipart/form-data` — `policy_type` (string: `individual|family_floater|group|top_up`) + 1–3 files under field name `files`.

**Server-side validation (Zod + manual checks), in order:**
1. Session present → else `401`.
2. Consent at current version present (`docs/specs/consent-capture.md`) → else `403 consent_required`.
3. `policy_type` is one of the four allowed values → else `400 invalid_policy_type`.
4. 1–3 files → else `400 unsupported_type` (zero files) or `400 too_many_documents` (more than 3).
5. Each file: MIME type is `application/pdf` → else `400 unsupported_type`. PDF-only at MVP; JPG/PNG phone-photo support is dropped (see note below).
6. Each file: size ≤ 5 MB → else `413 file_too_large`.
7. Each PDF: page count ≤ 60 (checked server-side via a PDF page-count library — do not trust a client-reported page count) → else `422 too_many_pages`.

**On success:**
1. Insert a `policies` document (`status: "processing"`).
2. For each file: store it in **GridFS** (`src/lib/gridfs/upload.ts`); insert a `documents` document (`status: "processing"`, `gridfs_file_id`). GridFS is still the system of record for the document viewer (`docs/specs/document-viewer-history-feedback.md`) to stream from later.
3. For each document, call n8n Flow 1's `document_ingestion` webhook (`src/lib/n8n/ingestion.ts`) with `{user_id, policy_id, document_id, file_base64, file_type}` — the file's bytes travel directly in the request body, base64-encoded. There is no file-fetch URL and n8n never calls back into the app during ingestion.
4. Return `{ "policy_id": "...", "documents": [{ "document_id": "...", "status": "processing" }, ...] }`.

**Why PDF-only and 5 MB, and why bytes instead of a URL:** the original design had n8n fetch the file from a short-lived app-generated URL, mirroring a signed-URL pattern. That only works if n8n can reach the app over the network — true in production, but n8n Cloud cannot reach a local dev server at all, which is a hard networking limitation, not a setting to disable. Sending the file's bytes directly in the webhook body removes that dependency entirely and works identically in dev and production. Base64 inflates size by ~33%, so the upload is restricted to PDF only (no JPG/PNG phone photos at MVP) and 5 MB max, keeping every request comfortably under typical webhook payload-size limits with no separate HTTP fetch step.

**Response:**
```json
{ "policy_id": "...", "documents": [{ "document_id": "...", "status": "processing" }] }
```

## `GET /api/policies/[id]/documents/[docId]/file`

Replaces the Supabase signed-URL mechanism. Streams the GridFS file to the caller after verifying a valid session owning this policy. n8n never calls this route — ingestion gets the file's bytes directly in the webhook body (above), not by fetching a URL — so this route exists solely for the document viewer (`docs/specs/document-viewer-history-feedback.md`) to stream from, authenticated by the browser's normal session cookie.

## `GET /api/policies` / `GET /api/policies/[id]`

Plain ownership-checked reads (`user_id` in every query filter — Section 11, `engineering-doc.md`) — no RLS backstop exists, so this check is the only one there is. `GET /api/policies/[id]` returns the policy plus its `documents` array (`status`, `doc_class`, `ocr_quality`, `unreadable_pages` once ingestion completes). **This route is polled by the frontend** (React Query `refetchInterval`) while `status: "processing"`, replacing the Supabase Realtime subscription design.

## Status propagation

n8n writes `documents.status`/`snapshot_terms`/`policies.status` **directly into MongoDB** (`docs/specs/n8n-ingestion-workflow.md`) using its own credential — there is no `/api/internal/ingestion-callback` route in this architecture. This route (`POST /api/policies`) fires the webhook and returns immediately; the frontend learns of completion purely by polling `GET /api/policies/[id]`.

## Edge cases

- One of 3 documents fails ingestion while the other two succeed → `policies.status` becomes `ready` only once **every** document resolves to `ready`; if any resolves to `failed`, `policies.status` is `failed` but the successfully-ingested documents' data is **not** discarded — the user can retry just the failed document (re-calling `document_ingestion` for that `document_id`, idempotent per the ingestion spec).
- A user uploads a 4th document to a policy that already has 3 → rejected (`400 too_many_documents`); per-document deletion/replacement within a policy is not built (not in MVP scope) — flagged as a gap if wanted later.
- Network drop mid-multipart-upload → a retried `POST /api/policies` creates a **new** `policies` document rather than resuming the old one (no resumable-upload support at MVP); any orphaned `processing`-forever documents from the failed attempt are harmless but are a known cleanup item, not a correctness bug.

## Acceptance criteria

```
Given a consented user uploading one 10-page PDF under 5MB
When POST /api/policies is called
Then a policies document and one documents document are created in MongoDB, the file is stored in GridFS, and n8n's document_ingestion webhook is called exactly once with the file's bytes in the request body

Given a user without a current-version consents document
When POST /api/policies is called
Then it is rejected 403 consent_required before any GridFS write

Given a 65-page PDF
When POST /api/policies is called
Then it is rejected 422 too_many_pages before any GridFS write or n8n call happens

Given 2 of 3 documents in a policy succeed and 1 fails
When ingestion completes for all three (n8n's direct MongoDB writes)
Then policies.status is "failed", but the 2 successful documents' extracted text, vector-store chunks, and snapshot terms remain usable

Given a policy still "processing"
When the frontend polls GET /api/policies/[id]
Then it keeps polling until status leaves "processing" — there is no push mechanism in this architecture
```
