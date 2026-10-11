# Data Deletion

**Implements:** US-015, FR-16
**API routes:** `DELETE /api/policies/[id]`, `DELETE /api/account`
**Data layer:** MongoDB (no cascading deletes) + GridFS + n8n's in-memory vector store. **No Supabase.**

---

## Scope

Two deletion granularities:
1. **Policy-level:** removes one policy and everything derived from it (documents, Snapshot, vector-store partition, chat sessions/messages, feedback on those messages).
2. **Account-level:** everything from (1) for every policy the user has, plus the `users`/`otp_codes`/`consents`/`payments` documents.

Both are **hard deletes** — no soft-delete flag, no retention window, no "undo."

## MongoDB has no cascading deletes — this is the central fact of this spec

Unlike the earlier Postgres design, deleting a `policies` document does **nothing** to its `documents`, `snapshot_terms`, `chat_sessions`, etc. — every one of those collections must be explicitly deleted, in application code, in the correct order. A missed collection in this list is a silent data-retention bug, not something the database will catch.

## `DELETE /api/policies/[id]`

1. Authenticate; verify the policy's `user_id` matches the session (`404` otherwise — never reveal existence of another user's policy).
2. Look up all `documents` for this `policy_id`; for each, delete its GridFS file (`gridfs_file_id`).
3. Delete all `documents` for this `policy_id`.
4. Delete all `snapshot_terms` for this `policy_id`.
5. Find all `chat_sessions` for this `policy_id`; for each session, delete its `chat_messages` and any `answer_feedback` referencing those messages, then delete the session.
6. Call n8n (or trigger the ingestion flow with an empty insert, per `docs/specs/vector-store.md`'s delete note) to clear the in-memory vector-store partition keyed by this `policy_id`.
7. Delete the `policies` document itself.
8. Return `{ "deleted": true }`.

This order matters: delete children before parents, and delete GridFS files before (or alongside) the `documents` metadata that points to them — once the `documents` document is gone, nothing records which GridFS file to clean up.

If step 6 (clearing the vector-store partition) fails after steps 1–5/7 already succeeded: the MongoDB state is correctly deleted, but a stale, unreachable vector-store partition may remain in n8n's memory under the old `policy_id` key — since that `policy_id` no longer exists anywhere else in the system, it can never be queried again, so this is a harmless memory leak rather than a data-leak risk; log it for Stage 7 monitoring rather than blocking the user-visible delete on it.

## `DELETE /api/account`

1. Authenticate; require an explicit confirmation flag in the request body (`{ "confirm": true }`) — missing it returns `400 confirmation_required`.
2. For every `policies` document owned by the user, run the full policy-deletion sequence above (steps 2–7).
3. Delete the user's `consents`, `otp_codes` (if any pending), and `payments` documents.
4. Delete the `users` document itself.
5. Invalidate the session (clear the JWT cookie server-side / rely on client-side sign-out) — there is no separate "auth system" row to delete, since this app issues its own session JWTs rather than using a third-party auth provider.
6. Return `{ "deleted": true }`; the frontend clears all local/session state and redirects to the signed-out landing page.

## What is explicitly NOT retained after deletion

- GridFS files — explicitly deleted in step 2/2 above, not left behind.
- `snapshot_terms` — explicitly deleted.
- Chat history (`chat_sessions`, `chat_messages`, `answer_feedback`) — explicitly deleted.
- Policy document chunks — the vector-store partition is cleared (Section above); note this is **not** a durability guarantee the same way a SQL cascade was, since the store was never durable to begin with (`docs/specs/vector-store.md`).
- n8n execution logs referencing this policy/document — **out of this app's direct control**; Stage 7 must configure n8n's own log retention so these don't outlive the minimum debugging window.
- Snowflake `CLAIMS_PLAYBOOK` data is never user-specific — nothing to delete there on a user's request.

## Edge cases

- Deletion requested while `document_ingestion` is still in-flight for that policy → Flow 1's direct MongoDB writes (`docs/specs/n8n-ingestion-workflow.md`) must check the `policy_id`/`document_id` still exists before writing, treating a missing target as a no-op, not an error — a real race now that there's no callback route to centralize this check, so each write-site in Flow 1 needs it independently.
- A chat request mid-flight (Flow 2 in progress) when its policy is deleted → the in-flight request may still complete and attempt to insert a `chat_messages` document for a session that's already gone; since MongoDB has no FK to reject this, the insert will **succeed and silently resurrect an orphaned message** unless the app route explicitly re-checks the session still exists before writing — this must be handled in code (`docs/specs/policy-chat-api.md`), not assumed away the way a Postgres FK violation would have caught it automatically.
- Deleting a policy with a `pending` payment for an unrelated feature unlock → `payments` is account-scoped, not policy-scoped, and unaffected by a policy-level delete.

## Acceptance criteria

```
Given a user deletes a single policy
When DELETE /api/policies/[id] completes
Then that policy's GridFS files, documents, snapshot_terms, chat history, and vector-store partition are all gone, and the user's other policies are untouched

Given a user deletes their whole account
When DELETE /api/account completes
Then every MongoDB document referencing that user_id (directly or via an owned policy_id) is gone, and the session is invalidated

Given a chat request for a policy that is deleted mid-flight
When the API route attempts to persist the resulting chat_messages document
Then it first re-checks the session/policy still exists and skips the write if not — no orphaned message is created

Given account deletion is requested without the confirm flag
When DELETE /api/account is called with an empty body
Then it is rejected with 400 confirmation_required and nothing is deleted
```
