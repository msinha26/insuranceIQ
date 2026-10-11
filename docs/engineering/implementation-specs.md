# PolicySaathi — Implementation Specs (Stage 1, companion to `engineering-doc.md`)

One spec block per feature, in the Stage 4 order from `CLAUDE.md`. Each block implements the PRD ids listed and is bound by the architecture decisions in `docs/engineering/engineering-doc.md` (single n8n workflow, two flows: `document_ingestion`, `document_retrieval`).

---

## 1. Phone OTP sign-in and consent screen

**PRD ids:** US-001, FR-01, FR-02

**User flow:** Enter phone → receive OTP (≤30s target) → enter code → session created, persists 30 days → first-time users see the consent screen before anything else is unlocked → accept → land on empty home/upload screen.

**DB schema touched:** `users`, `consents`.

**DB tasks:** insert/upsert `users` row on first successful OTP verify (Supabase Auth handles the auth.users row; app's `users` table mirrors `id`, `phone`, `created_at`); insert a `consents` row on accept, versioned.

**API routes:** `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `POST /api/consent`.

**n8n flow involved:** none.

**State management:** local form state for phone/OTP input; a single `useSession` React Query hook backed by Supabase Auth's session; `useConsentStatus` gates the rest of the `(app)` route group via a layout-level redirect.

**Component spec:** `PhoneInput`, `OtpInput` (6-box, auto-advance, resend countdown), `ConsentScreen` (scrollable consent text + "I agree" button disabled until scrolled to bottom — *(assumption: scroll-to-accept pattern, confirm with design)*).

**Design notes:** apply `/design-system` tokens once Stage 4 begins; disclaimer footer not required on this screen (no AI output yet).

**Edge cases:** OTP expired, OTP resent too many times (rate limit), phone number changes mid-flow, consent version bump requires re-consent for existing users, user under 18 (age gate — *(PRD states 18+ required; this document assumes a self-declared age checkbox at consent, since the PRD does not specify a verification mechanism — flag for confirmation)*).

---

## 2. Upload (PDF and photos) and the call to n8n Flow 1 (`document_ingestion`)

**PRD ids:** US-002, FR-03, FR-04, FR-05

**User flow:** pick/photograph up to 3 files → client validates type (PDF/JPG/PNG), size (≤20MB), page count (≤60) → submit → see per-document processing status → status flips to ready/failed per document.

**DB schema touched:** `policies`, `documents`.

**DB tasks:** insert `policies` row (`status=processing`); insert one `documents` row per file (`status=processing`); on callback, update `documents.extracted_text`, `ocr_quality`, `status`; update `policies.status` once all documents resolve.

**API routes:** `POST /api/policies`, `POST /api/internal/ingestion-callback`.

**n8n flow involved:** `document_ingestion` (Section 7.1 of the engineering doc) — OCR with per-page quality score (FR-05), text extraction with `[DOC n][PAGE n]` markers, chunking, embedding, vector storage.

**State management:** `useUploadMutation` (React Query mutation) with per-file progress; `usePolicyStatus` subscribes to Supabase Realtime for the `policies`/`documents` row and drives the status UI without polling.

**Component spec:** `DropZone` (drag-drop + camera capture on mobile), `DocumentStatusList` (per-file row: filename, status chip, retry button on failure).

**Design notes:** slow-connection state (Section 5 of engineering doc) must show elapsed time past 20s, since the 45s P95 budget is long enough to otherwise feel broken.

**Edge cases:** a photo with no readable text layer at all (full-page OCR failure) → that page lands in `unreadable_pages`, not a whole-document failure; more than 3 documents attempted → reject client-side and server-side; re-upload replacing a failed document → re-running `document_ingestion` for that `document_id` must replace its chunks, never duplicate (idempotency rule, Section 7.1); network drop mid-upload → resumable or restart-from-scratch *(assumption: restart-from-scratch at MVP, no resumable upload)*.

---

## 3. Document classification and missing-wording prompt

**PRD ids:** US-003, FR-06

**User flow:** after ingestion, if the uploaded document(s) classify as schedule-only (no wording/group-certificate document present), show a prompt asking the user to also upload the policy wording, with an explanation of why it matters.

**DB schema touched:** `documents` (`doc_class` column).

**DB tasks:** write `doc_class` from the classifier node's output during ingestion (already covered by Flow 1's callback in spec #2 — no separate write path).

**API routes:** none new — classification result rides on the existing `GET /api/policies/[id]` response.

**n8n flow involved:** `document_ingestion`, node 5 (`Document Classifier`, Section 7.1).

**State management:** derived from `usePolicyStatus`'s existing data — no new hook.

**Component spec:** `MissingWordingBanner` (dismissible, links to an "add document" action that re-enters the upload flow for the same policy).

**Design notes:** this is a banner, not a blocking modal — the user can still see whatever Snapshot/chat is possible from the schedule alone.

**Edge cases:** a document that doesn't fit any class (`other`) → still allowed through, just not eligible for the missing-wording nudge; user dismisses the banner and never adds wording → Snapshot/chat proceed with whatever's available, "Not found" used liberally (FR-07 guardrail).

---

## 4. Policy Snapshot

**PRD ids:** US-004, FR-07

**User flow:** land on the Snapshot screen once a policy is `ready` → see each tracked term with its value, page reference, confidence, and source sentence; low-confidence and OCR-flagged terms are visually marked; "Not found" terms are shown, not hidden.

**DB schema touched:** `snapshot_terms`.

**DB tasks:** rows written during ingestion (spec #2's callback path); read-only here.

**API routes:** `GET /api/policies/[id]/snapshot`.

**n8n flow involved:** `document_ingestion`, node 6 (`Snapshot Extraction`, Section 7.1) — produced during ingestion, not on-demand.

**State management:** `usePolicySnapshot` (React Query, keyed by `policyId`), invalidated by the same Realtime event that flips `policies.status` to `ready`.

**Component spec:** `SnapshotTermCard` (term, value, exact-sentence jump link carrying `page`/`line_number`/`bounding_box`, not just a page — per `docs/specs/policy-snapshot.md` and `docs/specs/document-viewer-history-feedback.md`, confidence badge), `ConfidenceBadge` (high/medium/low), `LowQualityFlag` (shown when the source page's OCR quality was low, regardless of the model's own confidence — guardrail from FR-05).

**Design notes:** "Not found" terms render with distinct, non-alarming styling — this is a valid, expected answer, not an error state.

**Edge cases:** a term found on a low-OCR-quality page with high model confidence → still flagged (guardrail overrides model confidence); a term appearing on multiple pages with conflicting values → *(PRD doesn't specify a resolution rule for this; flagged as an open question for the PRD owner, not resolved here)*.

---

## 5. Policy chat through n8n Flow 2 (`document_retrieval`), with page citations and the citation verifier

**PRD ids:** US-005, FR-09

**User flow:** open a policy's chat → ask a question (English/Hindi/Hinglish) → see the answer stream in with `[Page X]` citation chips and a "From your policy" label → tapping a citation jumps to that page in the viewer.

**DB schema touched:** `chat_sessions`, `chat_messages`.

**DB tasks:** create session on first message if none exists; insert both the user turn and the assistant turn (with `route`, `citations`) per exchange.

**API routes:** `POST /api/chat/sessions`, `POST /api/chat/sessions/[id]/messages`.

**n8n flow involved:** `document_retrieval` (Section 7.2) — `policy_agent` tool path, citation verifier node.

**State management:** `useChatMessages` (React Query, keyed by `sessionId`), optimistic insert of the user's message, streamed assistant response appended as tokens arrive (if streaming is enabled per the Section 7.2 latency note) or as a single update otherwise.

**Component spec:** `MessageBubble`, `CitationChip` (page AND line number, tap → viewer scrolled to the page with the exact sentence highlighted via `bounding_box` — per `docs/specs/citation-verifier.md`, not just a page jump), `SourceLabel` ("From your policy"), `DisclaimerFooter` (persistent, per FR-18).

**Design notes:** typing indicator past 3s, "still working" note past 8s (Section 5 slow-connection UX state).

**Edge cases:** citation verifier fails and the single regeneration also fails → show "could not verify this answer" rather than the unverified text (FR-09); question answerable only partly from the document → the orchestrator should still cite what it used and flag the gap rather than overclaiming; `document_retrieval` timeout → `upstream_unavailable`, retry button, no raw question logged in the error.

---

## 6. Query router and safety layer

**PRD ids:** FR-08, FR-11

**User flow:** invisible to the user except through its effects — every message is routed (document/Playbook/both/out-of-scope) and screened (input and output) before/around the answer in spec #5; an emergency-language message short-circuits to a fixed 112/nearest-hospital response and pauses the normal flow.

**DB schema touched:** `chat_messages.route` (already covered by spec #5's schema — this spec covers the *behavior*, not new tables).

**DB tasks:** none beyond what spec #5 already writes; routing decisions are logged for eval per FR-08 via the existing `route` column.

**API routes:** none new — this is internal to `document_retrieval`.

**n8n flow involved:** `document_retrieval`, nodes 2–3 and 7 (`Input Safety Screen`, `Intent Router`, `Output Safety Screen`, Section 7.2).

**State management:** the frontend only needs to render whatever `safety_flag`/`route` comes back — no new client state beyond spec #5.

**Component spec:** `EmergencyBanner` (112 + nearest-hospital CTA, replaces the normal chat input while active — "pauses the normal flow" per guardrail).

**Design notes:** the emergency banner must be the highest-contrast, most unmissable element on the screen — this is a safety-critical UI moment, not a normal notification.

**Edge cases:** ambiguous message that could be emergency or not ("my father is in a lot of pain") → err toward showing the emergency banner (guardrail: never under-trigger safety); a message that is both a document question and an out-of-scope request → safety/refusal wins, document answer is not given alongside a refusal.

---

## 7. Claims & Grievance Guide (Playbook), reimbursement checklist, grievance letter draft

**PRD ids:** US-006, US-007, US-012, US-013, FR-10, FR-14

**User flow:** ask a process/grievance question, or enter the guide via a dedicated screen → answer sourced only from `playbook_entries`, labelled "General guidance, last verified <date>" → reimbursement questions can render as a structured checklist, not just prose → from a grievance conversation, "Draft a letter" collects claim-specific details and produces an editable draft the user must send themselves.

**DB schema touched:** `playbook_entries` (read), new table needed for structured checklist state if checklists are stateful *(not in the PRD's core table list — flagged: this document assumes checklists are rendered client-side from a Playbook entry's structured content, not persisted per-user, since the PRD's core tables don't include one)*.

**DB tasks:** `playbook_entries` are seeded by the SME, never generated by this codebase or its prompts (guardrail — no regulatory facts written from memory, including in seed data; use `[SME-VERIFIED PLACEHOLDER]` rows until supplied).

**API routes:** `POST /api/chat/sessions/[id]/messages` (reused, routed to Playbook), `POST /api/playbook/letter-draft`.

**n8n flow involved:** `document_retrieval`, `playbook_agent` tool path (Section 7.2); letter draft generation location is explicitly flagged as **not finalized** in the engineering doc's Section 9 table — either reuses this flow's orchestrator or a dedicated app-side template fill.

**State management:** `usePlaybookAnswer` (shares `useChatMessages` under the hood — same endpoint, different `route`); `useLetterDraft` (mutation + editable textarea state, never auto-submits).

**Component spec:** `PlaybookSourceLabel` ("General guidance, last verified <date>" — distinct styling from `SourceLabel`), `ReimbursementChecklist` (checkbox list), `LetterDraftEditor` (editable textarea, explicit "copy" / "download" actions only — no "send" action, per the guardrail that the agent never acts for the user).

**Design notes:** the Playbook source label must be visually distinguishable from the document source label at a glance — this is the "source is always labelled" guardrail, and the two sources must never look identical.

**Edge cases:** a Playbook entry older than 120 days *(assumption, from PRD)* flagged for re-verification → still servable to users, just logged for the SME review queue, not hidden; a question that needs both document facts and Playbook process guidance → both tools called, both source labels shown, clearly separated in the answer; no matching Playbook entry → "I can't find this in our verified guidance" (never falls back to general LLM knowledge — guardrail).

---

## 8. Document viewer, history, per-answer feedback

**PRD ids:** US-010, US-011, US-014, FR-13, FR-15

**User flow:** tap a citation or "view document" → inline viewer jumps to the cited page, with a text fallback if rendering fails; history tab lists past policies and conversations, each reopenable; every assistant message has a thumbs up/down.

**DB schema touched:** `answer_feedback` (new writes); `chat_sessions`, `policies` (read-only for history).

**DB tasks:** insert `answer_feedback` row per thumbs tap (one per message per user — upsert on repeat taps, not duplicate rows).

**API routes:** `GET /api/chat/sessions`, `GET /api/policies`, `POST /api/feedback`.

**n8n flow involved:** none.

**State management:** `useChatHistory`, `usePolicyHistory` (both plain React Query list fetches); `useFeedback` (optimistic mutation, instantly flips the UI state before the request resolves).

**Component spec:** `DocumentViewer` (page-jump plus exact-sentence/table highlight overlay from `bounding_box`, zoom, text-fallback mode reconstructed from the vector store rather than a persisted text field — `docs/specs/document-viewer-history-feedback.md`), `HistoryList` (grouped by policy), `FeedbackButtons` (thumbs up/down, disabled after a selection is made — *(assumption: feedback is not changeable after submission; confirm)*).

**Design notes:** viewer's signed URL expires in 1 hour (Section 11 of engineering doc) — the viewer must detect an expired URL and silently re-fetch a fresh one rather than showing a broken-image state.

**Edge cases:** viewing a page from a document that was later deleted (race between viewer open and a delete action) → graceful "this document is no longer available" state; feedback on a message whose session was later deleted → cascades with the session (fk `ON DELETE CASCADE`).

---

## 9. Hindi and Hinglish

**PRD ids:** US-009, FR-12

**User flow:** user types a question in Hindi (Devanagari) or Hinglish → the assistant replies in the same language/register the user used, while any quoted policy clause stays in its original English source language, visually set apart from the surrounding translated explanation.

**DB schema touched:** none new — `chat_messages.content` already stores whatever language the model produced.

**DB tasks:** none new.

**API routes:** none new — this is a prompt/behavior requirement on the existing `document_retrieval` call, not a new endpoint.

**n8n flow involved:** `document_retrieval` — the orchestrator's system prompt must instruct language-matching and clause-language preservation (Section 7.2); embedding model must handle Hindi/Hinglish queries retrieving English chunks reasonably well — flagged in the engineering doc's embedding-model decision as something to spot-check in the bake-off.

**State management:** UI chrome language toggle (`useLocale`, Section 5's i18n dictionary) is independent of chat language — a user can have English UI chrome and chat in Hindi.

**Component spec:** `ClauseQuoteBlock` (visually distinct inline quote styling, used whenever an answer embeds a source-language clause inside a translated answer).

**Design notes:** Devanagari rendering must be checked against the chosen font stack in `docs/design.md` once that exists — flagged as a Stage 3/4 dependency, not resolved here.

**Edge cases:** a Hinglish question with mixed English technical terms (e.g. "sum insured kitna hai") → router/embedding must still match English policy terms correctly; a user switching languages mid-conversation → each turn matches its own language, no forced consistency across turns (FR-12 says "matching the user's turn," not the whole session).

---

## 10. Data deletion

**PRD ids:** US-015, FR-16

**User flow:** from account settings, delete a single policy or the whole account → confirmation step (destructive action) → hard delete completes → confirmation screen.

**DB schema touched:** all tables scoped to `policy_id` or `user_id` (Section 8's cascade list).

**DB tasks:** `DELETE` on `policies` (cascades to `documents`, `snapshot_terms`, `policy_chunks`, `chat_sessions`→`chat_messages`→`answer_feedback`); full account additionally deletes the `users` row and Storage objects.

**API routes:** `DELETE /api/policies/[id]`, `DELETE /api/account`.

**n8n flow involved:** none directly — deletion is a Supabase-side cascade, not an n8n call; n8n never holds a deletion path of its own (it only ever inserts via `document_ingestion`).

**State management:** `useDeletePolicy`/`useDeleteAccount` mutations; account deletion signs the user out and clears all local/session state on success.

**Component spec:** `DeleteConfirmationDialog` (requires typing a confirmation phrase or a second explicit tap — destructive-action pattern), `DeletionCompleteScreen`.

**Design notes:** this is one of the "Clicking any irreversible action control" cases from the assistant's own operating rules — the UI must make the irreversibility unmistakable before the API call fires.

**Edge cases:** deletion requested while an ingestion is still in-flight for that policy → the in-flight `document_ingestion` callback must handle a since-deleted `policy_id`/`document_id` gracefully (no-op, not an error) rather than trying to write to rows that no longer exist; Storage file deletion failing independently of the DB row deletion → must be retried/reconciled, not silently left orphaned (flagged for Stage 7 security review).

---

## 11. Payments

**PRD ids:** US-016

**User flow:** tap "Unlock pass/plan" → Razorpay UPI checkout → on success, entitlement unlocks within the PRD's 10-second target.

**DB schema touched:** `payments`.

**DB tasks:** insert `pending` row on order creation; update to `paid`/`failed` on webhook confirmation; entitlement check (Section 6 of engineering doc) reads this table directly — no separate entitlements table at MVP scope *(assumption)*.

**API routes:** `POST /api/payments/create-order`, `POST /api/payments/webhook`.

**n8n flow involved:** none.

**State management:** `useCreateOrder` mutation opens Razorpay's checkout SDK; `usePaymentStatus` polls or Realtime-subscribes to the `payments` row until it flips to `paid` (to drive the 10-second unlock confirmation in the UI) — *(assumption: Realtime preferred for consistency with the ingestion-status pattern already used elsewhere in this document)*.

**Component spec:** `PlanSelector`, `PaymentStatusBanner` (pending/success/failed states).

**Design notes:** none beyond standard design-system application — no AI output on this screen, so no disclaimer requirement here.

**Edge cases:** webhook arrives before the client-side checkout callback (common with UPI) → entitlement must unlock from the webhook alone, not depend on the client being present; duplicate webhook delivery (Razorpay retries) → idempotent update keyed on `razorpay_order_id`; payment succeeds but entitlement flag fails to flip due to a transient DB error → must be reconciled (retry the flip, don't silently leave a paid user unentitled) — flagged for Stage 7.

---

## Cross-cutting note: no regulatory facts

Every spec above that touches `playbook_entries` content (specs #7, and indirectly #9's Playbook answers) must source claim timelines, grievance deadlines, and Ombudsman limits **only** from SME-verified `playbook_entries` rows. No implementation task in this document writes such a fact into code, prompts, or seed data — placeholders are used until the SME supplies verified content, per the project-wide guardrail.
