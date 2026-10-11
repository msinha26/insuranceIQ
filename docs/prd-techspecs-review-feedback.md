# PRD ↔ Tech Specs Review — PolicySaathi

**Reviewed:** `docs/PolicySaathi_PRD.md` vs. `docs/engineering/engineering-doc.md`, `docs/engineering/implementation-specs.md`, and all of `docs/specs/` (`mongodb-schema.md`, `vector-store.md`, `playbook-schema-retrieval.md`, `n8n-ingestion-workflow.md`, `n8n-rag-workflow.md`, `ocr-quality-scoring.md`, `citation-verifier.md`, `query-router.md`, `safety-layer.md`, `consent-capture.md`, `data-deletion.md`, `auth-otp.md`, `upload-api.md`, `policy-snapshot.md`, `policy-chat-api.md`, `grievance-letter-draft.md`, `document-viewer-history-feedback.md`, `hindi-hinglish.md`, `payments-razorpay.md`) and `.env.example`.

**Note on inputs:** this skill's own file lists `supabase-schema.sql` as an expected input; it does not exist — Supabase was explicitly removed from the architecture by the user partway through Stage 2, and `mongodb-schema.md` + `vector-store.md` + `playbook-schema-retrieval.md` replace it. This is a sanctioned, documented architecture change (see `engineering-doc.md`'s opening note), not a gap this review penalizes. `CLAUDE.md`'s Stage 2 section text itself still says "`docs/specs/supabase-schema.sql`" — a documentation-sync item for `CLAUDE.md`, flagged once here, not tracked as a PRD-conformance finding.

---

## 1. Summary

The specs are a substantially faithful translation of the PRD's architecture and guardrails — the n8n flow design, the safety/citation/router machinery, and almost every guardrail in `CLAUDE.md` are correctly and often more rigorously implemented than the literal PRD text requires. The review originally surfaced several additional items that the product owner has since resolved directly (see "Resolved by product-owner decision" below); what remains after that is a smaller set of genuine gaps. **Verdict: BLOCKED** — see Section 8 for the current minimum fix list.

### Resolved by product-owner decision (2026-10-11)

- **FR-04/FR-16/US-015 "extracted text must be stored in the database"** — **retracted as a finding.** Under the chunked-RAG design, nothing reads a persisted full-text copy: chat reads chunks only, Snapshot Extraction runs on the in-flight OCR'd text within the same ingestion execution, and letter drafts pull facts via the same vector-store retrieval as chat. `CLAUDE.md` explicitly anticipates this kind of PRD wording — *"An earlier PRD draft passed the whole policy text to the model on every turn... if you find any leftover wording that implies that, the n8n design wins"* — and FR-04's "store text in the database" reads as exactly that: a description of the pipeline inherited from an earlier full-context draft, not a requirement with any operational path behind it given GridFS (source file) + the vector store (searchable chunks) + `snapshot_terms` (structured extraction) already cover everything that's actually used.
- **US-002 "unreadable pages... can be re-uploaded" (per-document retry/replace)** — **accepted as an explicit MVP scope reduction** by the product owner, overriding the PRD's literal P0 acceptance criterion. No longer a blocking finding; `upload-api.md`'s existing note (deferred, not built) stands as the documented decision rather than a gap.
- **n8n Architecture Conformance — chunk/retrieval `user_id` filtering** — **downgraded from FAIL to an accepted, documented tradeoff**, not silently dropped. `policy_id` is 1:1 owned by exactly one user, so partitioning the vector store by `policy_id` plus the API layer's ownership check (verified before n8n is ever called, `docs/specs/policy-chat-api.md`) gives isolation equivalent to a joint `(user_id, policy_id)` filter. This still doesn't match the PRD's literal text, which names both fields as defense-in-depth, so the residual risk — zero backstop at the vector-store layer if any API route's ownership check is ever wrong — is recorded here rather than erased. Product owner has accepted this risk.
- **Scalability constraint (200 concurrent uploads / 1,000 concurrent chat sessions)** — **not a target for this build**, per product-owner direction. Removed as a finding; the single-n8n-process design (`docs/specs/vector-store.md`) is fine as-is with no further capacity work needed.

---

## 2. Coverage Matrix

| ID | Requirement (from PRD) | Engineering Docs | Implementation Specs | Status |
|---|---|---|---|---|
| FR-01 | Sign-in by phone OTP; 30-day session | Covered | Covered (`auth-otp.md`) | PASS |
| FR-02 | Explicit versioned consent before first upload | Covered | Covered (`consent-capture.md`) | PASS |
| FR-03 | Accept PDF/image uploads within limits; reject others clearly | Covered | Covered (`upload-api.md`) | PASS |
| FR-04 | Extract text once with `[DOC n][PAGE n]` markers; OCR; call n8n ingestion | Covered | Covered — "store text in the database" resolved as leftover full-context wording, no operational path needs it (see Summary) | PASS |
| FR-05 | Per-page OCR quality score; flag numeric terms from low-quality pages | Covered | Covered (`ocr-quality-scoring.md`) | PASS |
| FR-06 | Classify each document; detect missing wording | Covered | Covered | PASS |
| FR-07 | Policy Snapshot: term, value, page, confidence, source sentence; "Not found" valid | Partial | Partial (`policy-snapshot.md`'s term list doesn't match PRD Flow 3's list; no numeric cross-check; no correction/flag mechanism) | **PARTIAL** |
| FR-08 | Route each turn to document/Playbook/both/out-of-scope; logged for eval | Partial | Partial (two-layer design produces the same outcome but not as one logged route label; emergency is a separate pre-check, not a router output as the PRD's own prompt table specifies) | **PARTIAL** |
| FR-09 | Document answers cite `[Page X]`, pass citation verifier; 1 regen then notice | Covered | Covered (`citation-verifier.md`) | PASS |
| FR-10 | Process/grievance answers only from Playbook; labelled, dated; no entry → says so | Covered | Covered (`playbook-schema-retrieval.md`) | PASS |
| FR-11 | No claim-approval prediction, no certain payable amount, no medical advice, no buy/port recommendation | Covered | Covered (`safety-layer.md`) | PASS |
| FR-12 | English/Hindi/Hinglish matching the user's turn; clause quotes stay in source language | Covered | Covered (`hindi-hinglish.md`) | PASS |
| FR-13 | Document viewer, jump-to-page, text fallback; **1-hour signed URLs** | Partial | Partial (GridFS + authenticated streaming replaces signed URLs — functionally similar protection, different mechanism than specified) | **PARTIAL** |
| FR-14 | Editable grievance letter draft from policy facts + claim details | Partial | Partial (`grievance-letter-draft.md` has no field for "the clause being contested" + its page, and no PDF export) | **PARTIAL** |
| FR-15 | Save all messages with role, route, citations, timestamp; linked to session/policy/user | Covered | Covered (linked via `session_id` → `chat_sessions.policy_id`/`user_id`) | PASS |
| FR-16 | User-initiated deletion of a policy or account; hard delete of files and text | Covered | Covered (`data-deletion.md`) | PASS |
| FR-17 | All tables protected by row-level security on user id; verified by CI tests | Missing (by necessity — no Postgres) | Missing (MongoDB has no RLS; replaced by application-code tenant filtering, explicitly flagged throughout as higher-risk) | **PARTIAL** (sanctioned architecture change, but the literal requirement cannot be met) |
| FR-18 | Disclaimer on every screen with AI output; exact text in PRD §9 | Missing | Missing (exact disclaimer text never written into any spec; `DisclaimerFooter` only specced for the chat screen, not Snapshot/Grievance/Letter screens) | **MISSING** |
| US-001 | OTP ≤30s; sign-in ≤60s; clear wrong-OTP error | Covered | Covered | PASS |
| US-002 | PDF/JPG/PNG ≤20MB/60pp; OCR scans; unreadable pages named | Covered | Covered — per-document re-upload explicitly deferred past MVP by product-owner decision (see Summary), overriding this acceptance criterion | PASS (scope accepted) |
| US-003 | Document labelled; missing-wording prompt | Covered | Covered | PASS |
| US-004 | Snapshot ≤45s P95; value/page/confidence; not-found shown | Partial | Partial (exact PRD wording "Not found in your documents" and the green/amber/red confidence banding + "Low confidence. Please check this on page X." warning aren't in the spec) | **PARTIAL** |
| US-005 | Answer ≤12s P95; every document answer cited; absent info → not found | Partial | Partial (engineering doc's own §7.2 explicitly flags the 3s/12s targets as "at risk," not yet verified) | **PARTIAL** (self-flagged already) |
| US-006 | Cashless/reimbursement steps from Playbook, **including my TPA and deadlines when present in the policy** | Partial | **Missing** — `claims_guide_agent`'s own prompt states "Do not read or interpret the user's policy; that is the insurance_policy_agent's job," and the "BOTH" path returns two separate answers, never a merged one with the user's own TPA/deadline facts folded into the Playbook steps | **MISSING** |
| US-007 | 3 escalation levels with links, documents, time limits from Playbook | Covered | Covered (content depends on Snowflake data, outside this codebase) | PASS |
| US-008 | Refuses approval/amount prediction; emergency redirect; no medical advice | Covered | Covered | PASS |
| US-009 | Hindi/Hinglish detected; same-language reply; clause stays English | Covered | Covered | PASS |
| US-010 | Citation opens viewer at page, **passage highlighted where a text layer exists** | Covered | Covered (2026-10-11 update) — every citation and Snapshot term now carries `line_number`/`bounding_box`, resolved via per-line OCR geometry threaded through ingestion → chunking → citation verifier (`docs/specs/n8n-ingestion-workflow.md`, `vector-store.md`, `citation-verifier.md`); the viewer renders a highlight overlay at the exact sentence/table, not just a page jump (`docs/specs/document-viewer-history-feedback.md`) | PASS |
| US-011 | Reopening a policy loads snapshot and chat history | Covered | Covered | PASS |
| US-012 | Letter includes policy number, claim ref, **contested clause with page**, relief sought; **exportable as text or PDF** | Partial | Partial — see FR-14 | **PARTIAL** |
| US-013 | Reimbursement checklist from Playbook + policy-specific list, tick boxes | Covered | Covered (flagged assumption: client-rendered from Playbook structured content) | PASS |
| US-014 | Thumbs up/down **with optional comment** on every answer | Partial | **Missing** — `answer_feedback` schema and `POST /api/feedback` contract have no comment field anywhere | **MISSING** |
| US-015 | Deletion removes files/text/snapshot/chats within 24h; confirmation shown | Covered | Covered | PASS |
| US-016 | UPI payment; entitlement active within 10 seconds | Partial | Partial (`payments-razorpay.md`'s own polling window is ~15s, which can exceed the PRD's 10s target as specced) | **PARTIAL** |
| US-017 | Decode settlement/rejection letters | Correctly excluded (v1.1) | Correctly excluded | PASS (out of MVP scope, as PRD states) |
| US-018 | WhatsApp share of snapshot | Correctly excluded (v1.2) | Correctly excluded | PASS (out of MVP scope, as PRD states) |
| Constraint — Scalability (200 concurrent uploads, 1000 concurrent chat sessions) | Not a target (product-owner decision) | Not a target | PASS (scope accepted) |
| Constraint — Encryption at rest/in transit (AES-256, TLS 1.2+) | Not addressed post-Supabase | Not addressed | **MISSING** |
| Constraint — DPDP breach notification + named grievance contact | Not addressed | Not addressed | **MISSING** |
| Constraint — 12-month auto-deletion after last access | Not addressed (only user-initiated deletion exists) | Not addressed | **MISSING** |
| Guardrail — Snapshot term correction/flagging (Flow 3 step 6; feeds the Snapshot correction rate metric) | Not addressed | Not addressed | **MISSING** |
| Guardrail — Numeric cross-check (room rent > sum insured rejected) | Not addressed | Not addressed | **MISSING** |

---

## 3. n8n Architecture Conformance

| Rule | Status | Evidence |
|---|---|---|
| Every chunk stores user id, policy id, document id, page number, chunk index | **ACCEPTED TRADEOFF** (product-owner decision, 2026-10-11) | `docs/specs/vector-store.md`'s per-chunk metadata is `page_number, chunk_index, chunk_type, document_id` — no explicit `user_id`/`policy_id` field. Accepted because `policy_id` is 1:1 owned by one user and already determines the chunk's entire partition (the `memoryKey`) — equivalent isolation to a joint filter, given the API layer verifies policy ownership before n8n is ever called. |
| Retrieval is filtered by user id and policy id inside the query | **ACCEPTED TRADEOFF** (product-owner decision, 2026-10-11) | Same reasoning as above. Residual risk, recorded rather than erased: zero backstop at the vector-store layer if an API route's ownership check (`docs/specs/policy-chat-api.md`) is ever wrong — the PRD's literal rule implies the filter itself is the backstop, and here the backstop has moved one layer up. |
| The browser never calls n8n; routes call the webhook with a server-side secret | **PASS** | Consistently maintained in `n8n-ingestion-workflow.md`, `n8n-rag-workflow.md`, `upload-api.md`, `policy-chat-api.md`. |
| Ingestion is idempotent | **PASS** | `docs/specs/vector-store.md` + `n8n-ingestion-workflow.md`: per-`policy_id` `memoryKey` with `clearStore: true`. |
| Deleting a policy or account deletes its chunks and embeddings | **PASS** | `docs/specs/data-deletion.md` explicitly clears the vector-store partition; MongoDB's lack of cascade is compensated with explicit ordered deletes. |
| n8n unavailable gives a clear error with retry and the file is preserved | **PASS** | `n8n-ingestion-workflow.md`/`n8n-rag-workflow.md`: 3× retry, fallback LLM provider, `upstream_unavailable`, file never deleted on OCR failure. |
| The app does not chunk, embed, or answer policy questions itself | **PASS** | Maintained throughout; all AI work happens inside n8n. |
| The same embedding model is used for ingestion and retrieval | **PASS (policy path) / N/A (Playbook path)** | `text-embedding-3-small` used identically for policy ingestion and policy retrieval. The Playbook no longer uses embeddings at all (plain SQL by topic against Snowflake) — this is a PRD-sanctioned architecture choice (§6 explicitly leaves "whether Playbook questions also go through n8n" and the retrieval mechanism open), not a rule violation. |

**ADDED-flag checks (Step 4):** no direct LLM SDK call for policy chat/ingestion in the app, no Azure AI Foundry reference, no leftover full-context-design wording — all clear (PASS).

---

## 4. Product Guardrail Conformance

| Guardrail (`CLAUDE.md`) | Status | Location |
|---|---|---|
| Two sources only (document or Playbook; never general model knowledge) | PASS | All agent prompts, `n8n-rag-workflow.md` |
| Every document answer cites `[Page X]` and passes the citation verifier | PASS | `citation-verifier.md` |
| Source is always labelled | PASS | "From your policy" / "General guidance, last verified \<date>" throughout |
| "Not found" is a valid answer | PASS | `insurance_policy_agent`/`claims_guide_agent` prompts |
| No regulatory facts in code or prompts | PASS | `playbook-schema-retrieval.md` — strengthened by Snowflake being entirely external/SME-managed |
| Agent never predicts approval/amount/medical advice/buy-port-cancel | PASS | `safety-layer.md`, `Output Safety Screen` |
| Emergency language shows 112, advises nearest hospital, pauses flow | PASS | `Emergency Pre-Check`, `n8n-rag-workflow.md` |
| Agent never acts for the user | PASS | No "send" action exists anywhere for letters |
| Ingestion and policy chat go through n8n only | PASS | Maintained throughout |
| Text extracted once, chunked/embedded with page numbers; chat reads chunks, never the file | **PARTIAL** | Chunking/page-numbers: PASS. "Text... stored": the extracted full text is not persisted anywhere post-ingestion (see FR-04 finding) |
| Retrieval always filtered by `policy_id` and `user_id` | **ACCEPTED TRADEOFF** | See n8n Architecture Conformance table above — `policy_id`-only partitioning accepted as equivalent given the API-layer ownership check |
| Numeric values from low-quality OCR pages always flagged | PASS | `ocr-quality-scoring.md` |
| Limits: PDF/JPG/PNG; 20MB/60pp; 3 docs | PASS | `upload-api.md` |
| Scope: health indemnity only; English docs; English/Hindi/Hinglish conversation | PASS | Throughout |
| Disclaimer on every AI-output screen, exact PRD §9 text | **FAIL** | See FR-18 finding |

---

## 5. Missing Requirements

**ID: US-006**
**Requirement:** Flow 5, step 2: the agent "answers from the verified Playbook... and **fills in policy-specific facts with citations (TPA helpline, intimation deadline)**." US-006 acceptance criteria: steps "include my TPA and deadlines **when present in the policy**."
**Gap:** `claims_guide_agent`'s system prompt (`docs/specs/n8n-rag-workflow.md`) explicitly states: "Do not read or interpret the user's policy; that is the insurance_policy_agent's job." The `Policy Orchestrator`'s `BOTH` path returns the two tools' answers "clearly separated... never merged," not a single answer with the user's own TPA/deadline facts woven into the Playbook steps as the PRD describes.
**Recommendation:** Either (a) have the `Policy Orchestrator` pass the policy's known TPA name/intimation-deadline facts (from `snapshot_terms`) into `claims_guide_agent`'s call so it can fold them into its `STEPS`/`WHERE_TO_FILE` response, or (b) accept the separated-answer design as a deliberate simplification and get explicit product-owner sign-off that it satisfies US-006's intent — this is a product decision, not something this review can resolve on its own.

**ID: US-014**
**Requirement:** "Thumbs up or down **with optional comment** on every answer."
**Gap:** `mongodb-schema.md`'s `answer_feedback` collection (`_id, message_id, user_id, is_positive, created_at`) and `POST /api/feedback`'s request contract (`{message_id, is_positive}`) have no comment field anywhere in the spec set.
**Recommendation:** Add `comment: string | null` to the `answer_feedback` schema and the `POST /api/feedback` request/response contracts in `document-viewer-history-feedback.md`.

**ID: FR-18**
**Requirement:** "Disclaimer on every screen with AI output." PRD §9 gives the exact required text: *"PolicySaathi explains your policy documents. It is not your insurer, and this is not legal, medical or financial advice. Your insurer's decision on a claim may differ. Confirm before you act."*
**Gap:** This exact text does not appear anywhere in `docs/engineering/engineering-doc.md` or `docs/engineering/implementation-specs.md` — only a reference to "the FR-18 disclaimer." `DisclaimerFooter` is also only listed under the chat component group (`components/chat/{..., DisclaimerFooter}`) — not under Snapshot, Claims & Grievance Guide, or Letter Draft screens, all of which also carry AI output per the PRD.
**Recommendation:** Add the verbatim disclaimer text to `docs/engineering/engineering-doc.md` (e.g. in a new Section 5 subsection or an explicit callout), and move/duplicate `DisclaimerFooter` into the shared component set so it renders on the Snapshot, Grievance Guide, and Letter Draft screens, not just chat.

**ID: Constraint — Encryption at rest/in transit**
**Requirement:** "Encryption at rest (AES-256) and in transit (TLS 1.2 or higher)."
**Gap:** `engineering-doc.md` §11 (Security and Privacy) does not mention encryption at rest or in transit anywhere post-Supabase-removal (the original Supabase-era draft relied on this being a Supabase platform default and never stated it explicitly either, but now there is no implicit platform guarantee to point to — MongoDB deployment choice (self-hosted vs. Atlas) determines this, and it's unaddressed).
**Recommendation:** Add an explicit statement to Section 11 naming the MongoDB deployment's encryption-at-rest configuration and confirming TLS for all connections (app↔MongoDB, app↔n8n, n8n↔Snowflake/MongoDB).

**ID: Constraint — DPDP breach notification + named grievance contact**
**Requirement:** "DPDP Act 2023: explicit consent, stated purpose, deletion on request, breach notification, and a named grievance contact."
**Gap:** Consent and deletion are covered (`consent-capture.md`, `data-deletion.md`). Breach notification procedure and a named grievance contact/officer appear nowhere in any spec.
**Recommendation:** Flag for Stage 7 (`/security-foundation`) explicitly — this is likely a legal/ops deliverable more than a code deliverable, but it should be named as an open item now, not discovered at Stage 7.

**ID: Constraint — 12-month auto-deletion**
**Requirement:** "Data retention: documents and chats kept for 12 months after last access, then deleted."
**Gap:** `docs/specs/data-deletion.md` only covers user-initiated deletion. No scheduled job or mechanism for automatic deletion after 12 months of inactivity exists anywhere in the spec set.
**Recommendation:** Add a spec (or a section in `data-deletion.md`) for a scheduled retention-expiry job, including how "last access" is tracked (a `last_accessed_at` field would need to be added to `policies`/`chat_sessions`, which also doesn't currently exist).

**ID: PRD Flow 3, step 6 (Snapshot correction) / Secondary Metric "Snapshot correction rate"**
**Requirement:** "User can flag a term as wrong and enter the right value; the original is kept for the feedback loop." Secondary metric: "Snapshot correction rate ≤ 10% of terms flagged wrong by users."
**Gap:** No spec, schema field, or API route anywhere supports flagging/correcting a Snapshot term. Without this, the PRD's own secondary metric cannot be computed at all.
**Recommendation:** Add a `snapshot_corrections` collection (or fields on `snapshot_terms`) and a `POST /api/policies/[id]/snapshot/[termId]/correct` route, keeping the original value alongside the user's correction as the PRD specifies.

**ID: PRD §9, Extraction-layer guardrails — Numeric cross-check**
**Requirement:** "Numeric cross-check. Sum insured and room rent values are checked for plausibility (for example, a room rent limit greater than the sum insured is rejected and flagged)."
**Gap:** No such cross-check appears in `docs/specs/policy-snapshot.md` or `n8n-ingestion-workflow.md`'s Snapshot Extraction step.
**Recommendation:** Add a plausibility-check step after Snapshot Extraction (either as a code node in Flow 1 or a validation pass in the extraction prompt's post-processing) that flags implausible numeric relationships between Snapshot terms.

---

## 6. Partial Coverage

**ID: FR-07 / US-004 (Snapshot term list and presentation)**
**What is covered:** `docs/specs/policy-snapshot.md` defines a term/value/page/confidence/source-sentence/is_not_found schema and extraction behavior.
**What is missing:** The spec's own 15-term list was explicitly self-flagged as "derived... should be confirmed against PRD §4/§6 verbatim wording" — now checked against the actual PRD text (Flow 3, step 3), it is missing several PRD-named terms: insurer name, product name, members covered, TPA name and helpline, deductible, disease-wise sub-limits (only a generic "sub_limits" exists), consumables cover, specific-disease waiting period, AYUSH, ambulance limit, restoration benefit, no-claim bonus, claim intimation window, reimbursement submission window. It also includes one term (`renewal_age_limit`) not named anywhere in the PRD (minor scope addition, see Section 7). Separately, the PRD's specific green/amber/red confidence banding (≥80%/50-79%/<50%) and the red-band warning text ("Low confidence. Please check this on page X.") aren't in the spec, and US-004's exact "Not found in your documents" wording isn't recorded.
**Recommendation:** Replace the term list in `policy-snapshot.md` with the PRD's actual Flow 3 list verbatim, and add the confidence-banding thresholds and warning copy.

**ID: FR-08 (Query routing design)**
**What is covered:** A working two-layer routing design (`Intent Router` + `Policy Orchestrator`'s own tool selection) that produces the same practical outcomes as the PRD's four-way route.
**What is missing:** The PRD's own Prompt Strategy table specifies the router's output as a single JSON object `{ route: document/playbook/both/out_of_scope/emergency, language }` — one classification step covering routing, emergency detection, *and* language, all logged together. The actual design splits this into a deterministic pre-check (emergency, outside any logged classification), a classifier (`insurance_policy_question`/`general_question`), and the orchestrator's own un-logged-as-a-discrete-step tool choice — with no `language` field captured at all.
**Recommendation:** Either accept and document this as a deliberate, safety-motivated deviation (the deterministic emergency check is arguably better than an LLM classifier for that specific case) and note it no longer matches the PRD's literal prompt-table design, or add a `language` field to the `router_eval_log` entries for eval parity with the PRD's stated design.

**ID: FR-13 (Document access mechanism — passage highlighting resolved 2026-10-11, access mechanism still open)**
**What is covered:** Authenticated, per-request GridFS streaming replaces signed URLs with an arguably stronger access-control model (no time-limited-but-shareable URL at all). Passage-level highlighting (US-010) is now fully specced — see the Coverage Matrix update above.
**What is missing:** The PRD's literal mechanism ("1-hour signed URLs") still isn't what's built.
**Recommendation:** Confirm with the product owner that authenticated streaming satisfies the intent behind "1-hour signed URLs" (time-limited, controlled access) even though the mechanism differs. No further spec work needed for passage highlighting.

**ID: FR-14 / US-012 (Letter draft contract)**
**What is covered:** Policy facts + user-supplied claim details → a plain-text draft, with the no-send guardrail enforced structurally.
**What is missing:** No field in the `claim_details` request schema for "the clause the user is contesting" (with its page), which Flow 5 step 4 explicitly requires the letter to include. No PDF export — only "copy"/"download" (implied plain text).
**Recommendation:** Add `contested_clause: { text, page }` to the `claim_details` schema in `docs/specs/grievance-letter-draft.md`, and either confirm text-only export is acceptable or add a PDF-generation step.

**ID: FR-17 (Tenant isolation for MongoDB app-data collections — distinct from the vector-store point already resolved in the Summary)**
**What is covered:** Extensively and transparently — every spec that touches `users`/`policies`/`documents`/`chat_sessions`/`chat_messages`/etc. explicitly states the application-code `user_id`-filter requirement and flags it as higher-risk than the Postgres+RLS design it replaces (`mongodb-schema.md`, `engineering-doc.md` §6/§11).
**What is missing:** Nothing new beyond what's already self-flagged — this remains in Partial Coverage, not Missing, because the gap is already fully documented. It is a literal non-conformance with FR-17's specific wording ("row-level security") for these collections (separate from the vector-store question the product owner already resolved above).
**Recommendation:** No spec change needed; confirm the same product-owner acceptance already given for the vector store also covers these collections — i.e. application-level tenant filtering, not database-level RLS, for the whole MongoDB data layer, not just the vector store.

**ID: PRD §7, "Conflicts" (schedule/wording vs. general rule)**
**What is covered:** The `BOTH` routing path exists and returns both a policy answer and Playbook guidance.
**What is missing:** No prompt instructs any agent on the PRD's specific conflict-handling rule: "Where the policy wording is more favourable or more specific than the general rule, the agent states both and tells the user to raise the difference with the insurer. It does not rule on which prevails."
**Recommendation:** Add this instruction to the `Policy Orchestrator`'s system prompt for its `BOTH` case.

**ID: PRD §7, "Conversation memory... older turns are summarised"**
**What is covered:** Last-20-turns windowing is implemented and correct.
**What is missing:** Already self-flagged in `docs/specs/policy-chat-api.md`: turns beyond 20 are dropped, not summarized, which satisfies "last 20 turns" but not "older turns are summarised."
**Recommendation:** Accept as a stated simplification (needs its own LLM call to implement properly) or build summarization — a product decision, not purely an engineering gap.

**ID: US-016 (10-second entitlement unlock)**
**What is covered:** A polling-based unlock mechanism that correctly reacts to the webhook rather than only the client-side checkout callback.
**What is missing:** `docs/specs/payments-razorpay.md`'s own stated polling window (~15 seconds) can itself exceed the PRD's 10-second target before the UI even finishes polling, let alone accounting for webhook delivery latency on top.
**Recommendation:** Tighten the polling interval/window (e.g. poll every 500ms–1s for up to 8 seconds) so the mechanism can plausibly hit the 10-second target, and measure actual webhook latency once built.

**ID: Section 5, Reliability constraint — "99.5% uptime"**
**What is covered:** Error handling, retries, and fallback providers throughout.
**What is missing:** No monitoring/alerting/SLA-tracking design tied to this specific number anywhere in the specs (reasonably a Stage 7 concern, but worth naming now).
**Recommendation:** Carry forward explicitly as a Stage 7 (`/security-foundation`) input rather than letting it fall through silently.

---

## 7. Scope Additions (Out-of-PRD Work)

**Location:** `docs/specs/policy-snapshot.md`, Snapshot term list, `renewal_age_limit`
**Addition:** A tracked Snapshot term for "lifetime renewability Yes/No" that doesn't appear anywhere in the PRD's own Flow 3 term list.
**Assessment:** Minor. Plausibly useful, but not requested, and its presence slightly obscures the fact that several PRD-named terms (see Section 6, FR-07) are *missing* from the same list — fixing the list wholesale (per the Missing/Partial findings) should resolve this too.
**Recommendation:** Remove it, or keep it only if the product owner confirms it's wanted — either way, fold this into the same term-list correction as the FR-07 finding rather than treating it separately.

**Location:** `docs/specs/n8n-rag-workflow.md`, `Emergency Pre-Check`, `Citation Verifier`, `Output Safety Screen`
**Addition:** Three nodes with no equivalent in the user's literal reference workflow template.
**Assessment:** **Not scope creep** — each directly implements an explicit PRD/guardrail requirement (emergency redirect, FR-09's citation verifier, FR-11's safety checks) that the reference template, being a generic course example, simply didn't include. Flagged here only for completeness, per the skill's instruction to note every addition; the assessment is that these are required, not additive scope.
**Recommendation:** Keep as specced.

**Location:** `docs/specs/query-router.md`, `router_eval_log` collection
**Addition:** A MongoDB collection not named in the PRD's core-tables list.
**Assessment:** Not scope creep — directly implements FR-08's "Router output logged for eval" requirement, which has no other home in the PRD's own schema.
**Recommendation:** Keep as specced.

---

## 8. Overall Verdict

**BLOCKED** — reduced scope after product-owner resolution of four items (see Summary).

Minimum set of changes required to reach APPROVED:

1. Resolve the Playbook-personalization gap for US-006 — either wire policy facts into `claims_guide_agent`'s call, or get explicit product-owner sign-off on the separated-answer design.
2. Add a comment field to `answer_feedback` and `POST /api/feedback` (US-014).
3. Write the verbatim FR-18 disclaimer text into the engineering doc and extend `DisclaimerFooter` to every AI-output screen, not just chat.
4. State the MongoDB deployment's encryption-at-rest/in-transit posture explicitly.
5. Name the DPDP breach-notification procedure and grievance contact as an explicit open item for Stage 7, if not resolved now.
6. Add (or explicitly defer with product-owner sign-off) the 12-month auto-deletion job and the Snapshot term correction/flagging mechanism — both needed for the PRD's own metrics and compliance claims to be achievable.
7. Add the numeric plausibility cross-check (room rent > sum insured) to Snapshot Extraction.

Items in Section 6 (Partial Coverage) that don't block APPROVAL on their own but should be resolved or explicitly accepted before Stage 3: the FR-07 Snapshot term list correction, FR-08's routing-design deviation from the PRD's prompt table, FR-13's signed-URL-vs-authenticated-streaming sign-off (passage highlighting is now resolved), FR-14/US-12's letter contract fields, the FR-17 RLS sign-off for MongoDB app-data collections, the §7 conflict-handling prompt rule, and the US-016 polling-window tightening.
