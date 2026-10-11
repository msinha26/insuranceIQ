# Document Viewer, History, and Per-Answer Feedback

**Implements:** US-010, US-011, US-014, FR-13, FR-15
**API routes:** `GET /api/policies/[id]/documents/[docId]/file`, `GET /api/chat/sessions`, `GET /api/policies`, `POST /api/feedback`
**Data layer:** MongoDB + GridFS. **No Supabase Storage, no signed URLs.**

---

## Document viewer (US-010, FR-13)

- The viewer renders the original uploaded file (PDF or image) by streaming it from `GET /api/policies/[id]/documents/[docId]/file` (`docs/specs/upload-api.md`) — an authenticated route that checks ownership on **every request**, since GridFS has no signed-URL concept of its own. This replaces the earlier 1-hour-signed-URL design: there is no URL to expire, because every fetch is freshly authenticated.
- Because access is per-request authentication rather than a time-limited URL, there is no "expired URL" failure mode to handle — a render failure is either a genuine file problem (→ text fallback) or an auth/ownership failure (→ the session-expiry handling already in place elsewhere in the app), not a special case specific to this feature.

### Exact-sentence navigation (the point of US-010's "passage highlighted where a text layer exists")

Every citation chip (chat) and `SnapshotTermCard` (Snapshot) now carries `{page, line_number, bounding_box}` (or `{page, bounding_box}` for a table-sourced citation, with no `line_number` — `docs/specs/citation-verifier.md`, `docs/specs/policy-snapshot.md`). Tapping one navigates the viewer with all of this, not just the page:

- `/policies/[id]/viewer?page=14&line=3&bbox=0.12,0.44,0.76,0.02` (or the equivalent state passed via the app's router/store rather than literal query params — the four numbers are `x, y, width, height` as fractions of the page, 0–1, matching what OCR returned).
- **Rendered-file mode (PDF/image loads successfully):** the viewer scrolls/paginates to `page`, then draws a highlight overlay — an absolutely positioned, semi-transparent box — at `bbox`, scaled to the rendered page's actual on-screen pixel dimensions (`bbox` is normalized, so this scaling works at any zoom level or screen size). The highlight is the actual sentence/table region, not an approximation. A table-sourced citation (no `line_number`) highlights the whole table's `bbox` instead of one line.
- **Text fallback mode** (file fails to render — corrupted PDF, unsupported browser): there is no persisted full-page text to fall back to (no `extracted_text` field exists — see `docs/engineering/engineering-doc.md`'s Summary on why that field isn't needed for the features that actually read text). Instead, reconstruct the visible text for `page` by concatenating the `content` of whatever chunks for that `page_number` still exist in the n8n in-memory vector store (`GET` a small internal n8n endpoint or extend `document_retrieval`'s contract with a "fetch page text" mode — *implementation detail for Stage 4, not fully specified here*), and scroll to/bold the matched `line_number` within that reconstructed text. If the vector-store partition has been lost (e.g. an n8n restart with no re-ingestion since — `docs/specs/vector-store.md`), there is nothing to reconstruct from; show "Preview unavailable for this page — try re-processing the document" rather than a blank or broken view. Either way, a visible note marks this as a reconstructed OCR transcript, not the original layout.
- Because `bounding_box`/`line_number` are already persisted on the citation or Snapshot term itself (not re-derived at view time), this navigation works identically whether the chat answer or Snapshot term was produced moments ago or weeks ago — it never depends on the vector store still having that policy's chunks, **except** in the text-fallback-after-render-failure path above, which is the one scenario that does.

## History (US-011, FR-15)

- `GET /api/policies` + `GET /api/chat/sessions`, both plain ownership-checked reads (`user_id` in the query filter — no RLS backstop exists), no pagination cursor needed at MVP scale *(default — revisit if a user accumulates very many policies/sessions)*.
- Each `chat_messages` document already stores `role`, `content`, `route`, `citations`, `created_at` (FR-15's full requirement) — history reopens a session by re-fetching its messages, not by replaying anything.

## Per-answer feedback (US-014)

**`POST /api/feedback`:**
```json
{ "message_id": "...", "is_positive": true }
```
- Upserts into `answer_feedback` on the unique `(message_id, user_id)` index (`docs/specs/mongodb-schema.md`) — tapping thumbs-up then thumbs-down on the same message **updates** the existing document rather than creating a second one.
- Only the message's own session owner can submit feedback on it — enforced in application code by looking up `chat_messages.session_id` → `chat_sessions.user_id` and comparing to the authenticated user (there is no RLS to do this automatically).
- Feedback data feeds the PRD's post-launch monitoring thresholds (thumbs-down > 25% in any 7-day window triggers an alert — *assumption, from PRD, Stage 7/ops concern*).

## Edge cases

- Feedback submitted on a message whose session was deleted in the same moment → MongoDB has no cascade, so the `chat_messages` document could in principle still exist even after its session is "deleted" if `docs/specs/data-deletion.md`'s sequence was interrupted partway — the feedback route should look up the message and fail gracefully (`404 not_found`) if it's missing, and should not assume a deleted session implies a deleted message without checking.
- Viewing a document that was deleted between opening the citation chip and the viewer loading (race) → the authenticated file route returns `404`, UI shows "this document is no longer available," not a broken viewer.
- A user with dozens of policies opening history → no pagination built at MVP is an accepted scope limit, not a bug.
- A citation whose `bounding_box` is missing or malformed (shouldn't happen per `docs/specs/citation-verifier.md`'s contract, but defensively) → fall back to page-level jump with no highlight, rather than failing to open the viewer at all.
- The rendered page's on-screen size differs from the OCR'd page's original dimensions (responsive layout, pinch-zoom) → because `bounding_box` is stored as a 0–1 fraction of the page, not absolute pixels, the overlay always scales correctly — this only breaks if the viewer renders the page at the wrong aspect ratio, which is a rendering bug, not a data problem.

## Acceptance criteria

```
Given a citation chip for page 14, line 3, with a resolved bounding_box
When the user taps it
Then the document viewer opens scrolled/paginated to page 14 AND draws a highlight overlay at that exact bounding_box, fetched via the authenticated file route

Given a table-sourced citation (chunk_type: "table", no line_number)
When the user taps it
Then the viewer highlights the whole table's bounding_box, not a single line

Given the rendered file fails to load but the policy's vector-store partition still has chunks for that page
When the viewer falls back to text mode
Then it reconstructs that page's text from the vector store's chunks and scrolls to/bolds the matched line_number, with a visible "OCR transcript" note

Given the rendered file fails to load AND the vector-store partition has been lost (no re-ingestion since an n8n restart)
When the viewer falls back to text mode
Then it shows "Preview unavailable for this page — try re-processing the document" rather than a blank or broken view

Given a user whose session has expired while the viewer was open
When the next file fetch runs
Then the normal session-expiry handling (re-authenticate) applies — there is no separate "signed URL expired" case to handle

Given a user taps thumbs-up then thumbs-down on the same message
When both requests complete
Then answer_feedback has exactly one document for that message_id/user_id pair, with is_positive reflecting the latest tap

Given a user opens the history tab
When GET /api/chat/sessions and GET /api/policies are called
Then only that user's own policies and sessions are returned — verified by the route's own user_id filter, since there is no database-level enforcement backing it up
```
