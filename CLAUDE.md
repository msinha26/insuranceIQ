# Project Guide

This project uses a structured, step-by-step workflow to go from a product idea to a fully built app. The application target is **PolicySaathi** (placeholder name): a chat platform where patients and families in India upload a health insurance policy, ask questions, and get answers grounded in the document, plus verified guidance on claims and grievance escalation.

Seven skills drive the process. Follow the stages in order and **never move to the next stage without explicit user approval**.

`docs/PolicySaathi_PRD.md` is the source of truth for product behaviour. If this file and the PRD disagree, stop and ask.

---

## Core Rule: Always Wait for Approval

After completing any stage, stop. Present what was produced. Ask the user if they are happy to proceed to the next stage. Do not move forward until they say yes.

---

## Repository Layout

```
dev-os/
├── .claude/                      # Claude Code local settings
├── policysaathi/                 # The Next.js app (created in Stage 3)
├── docs/
│   ├── engineering/              # Stage 1 output
│   ├── specs/                    # Stage 2 output
│   ├── PolicySaathi_PRD.md       # Product Requirements Document
│   └── design.md                 # Brand design system
├── skills/                       # Custom skills (slash commands)
├── .env.example                  # Stage 2 output
├── .gitignore
├── CLAUDE.md                     # This file
├── netlify.toml                  # Netlify build and deploy config
└── README.md
```

All application code lives in `policysaathi/`. Documents never go inside the app folder; code never goes inside `docs/`.

---

## Core Architecture: One n8n Workflow, Two Flows

Policy ingestion and policy question-answering run in **n8n**, not in the Next.js app. The app is the interface and the caller; n8n does the document processing and the retrieval-augmented generation (RAG). Every engineering doc, spec and feature must follow this.

```
UPLOAD
User uploads policy → Next.js API route stores the file in Supabase Storage
  → calls n8n Flow 1 (Ingestion) by webhook
  → n8n extracts text, splits it into chunks, embeds each chunk
  → n8n stores chunks + embeddings + metadata in the vector DB
  → n8n reports status back → app shows the policy as ready

CHAT
User asks a policy question → Next.js API route
  → calls n8n Flow 2 (RAG) by webhook
  → n8n embeds the question, retrieves the top matching chunks for THAT policy only
  → n8n sends question + retrieved chunks to the LLM
  → n8n returns the answer with page citations → app displays it
```

### Structure: one n8n workflow, two webhook flows
Both jobs live in a **single n8n workflow**, currently named `AgenticRAGWorkflow-Week-4`. It has two independent flows, each started by its own Webhook node:

| Flow | Webhook | Started by |
|---|---|---|
| **Flow 1 — Policy Ingestion** | `POST /webhook/document_ingestion` | the upload API route |
| **Flow 2 — Policy RAG** | `POST /webhook/document_retrieval` | the chat API route |

- The two flows share no nodes on the main path; they share the workflow, its credentials and its active/inactive switch. Activating or deactivating the workflow affects upload and chat together.
- There is one exported JSON file for the whole workflow, not one per flow.
- The PRD (section 6) calls these "Workflow 1" and "Workflow 2". They are the same two things: PRD Workflow 1 = Flow 1, PRD Workflow 2 = Flow 2. This is a naming difference, not a disagreement with the PRD.

### Flow 1 — Policy Ingestion (chunk, embed, store)
- **Triggered by:** the upload API route, once per uploaded document. Never called from the browser.
- **Input:** `user_id`, `policy_id`, `document_id`, and a short-lived signed URL to the file.
- **Does:** extract text (OCR for scans and photos), split into chunks, embed each chunk, write to the vector DB.
- **Every chunk must carry metadata:** `user_id`, `policy_id`, `document_id`, `page_number`, `chunk_index`. Page number is what makes `[Page X]` citations possible; a chunk without it is a bug.
- **Output:** status (`processing`, `ready`, `failed`), chunk count, pages that could not be read.
- **Must be idempotent:** re-running for the same `document_id` replaces its chunks, never duplicates them.

### Flow 2 — Policy RAG (retrieve, answer)
- **Triggered by:** the chat API route, once per policy question. Never called from the browser.
- **Input:** `user_id`, `policy_id`, the question, recent chat turns.
- **Does:** embed the question, retrieve the top matching chunks **filtered by `policy_id` and `user_id`**, pass them with the question to the LLM, return the answer.
- **Output:** answer text, the chunks used (with page numbers), and a `not_found` flag when retrieval returns nothing relevant.
- **The LLM sees only the retrieved chunks.** It answers from them or says it cannot find the answer.

### Rules for both flows
- The Next.js API route authenticates the user first, then calls n8n with a shared secret. n8n webhook URLs and secrets are server-side environment variables only.
- n8n never trusts a `user_id` or `policy_id` it did not receive from the authenticated API route.
- Deleting a policy or an account must also delete its chunks and embeddings from the vector DB.
- The workflow is exported as one JSON file and committed under `docs/specs/n8n/` so it is versioned with the specs.

### Where this is in the PRD
PRD section 6 (Architecture Overview) defines the same two flows under the names Workflow 1 and Workflow 2, and sections 4, 7 and 8 refer to them. An earlier PRD draft passed the whole policy text to the model on every turn with no chunked retrieval; if you find any leftover wording that implies that, the n8n design wins — flag it to the user. Consequences to carry into the engineering plan:
- A retrieval miss can now produce a wrong "not found". The eval must measure retrieval recall, not only answer quality.
- The citation verifier checks the answer against the retrieved chunks' pages.
- The 60-page limit was set for the full-context design; the PRD keeps it at MVP as an OCR cost and latency cap.

---

## The Build Workflow

### Stage 1 — Engineering Plan
**Skill:** `/engineering-planner`
**Input:** `docs/PolicySaathi_PRD.md`
**Output:** `docs/engineering/engineering-doc.md` + `docs/engineering/implementation-specs.md`

Transform the PRD into two documents:
- `engineering-doc.md` — high-level architecture (stack, flows, DB design, API spec, folder structure)
- `implementation-specs.md` — one detailed spec block per feature (user flow, DB schema, DB tasks, API routes, state management, component spec, design, edge cases)

Before generating, use `AskUserQuestion` to resolve missing architectural decisions. The PRD deliberately leaves these open, so ask; do not assume:
- **LLM provider and model tiers.** The PRD requires a bake-off on the eval set and names no model. It needs a larger tier for the Policy Snapshot and a smaller tier for routing and simple turns, with prompt caching.
- **OCR vendor** for scanned PDFs and phone photos (bake-off on 50 phone-photo policies).
- **n8n hosting:** n8n Cloud or self-hosted, and in which region. Policies carry health data and the PRD requires India-region storage.
- **Vector DB:** Supabase pgvector (same platform, RLS available) or a separate vector store.
- **Embedding model**, used by both n8n workflows (it must be the same model for ingestion and retrieval) and for Playbook retrieval.
- **Chunking strategy:** chunk size, overlap, and how sub-limit tables are kept whole.
- **Where OCR runs:** inside the ingestion workflow or in the app before n8n is called.
- **How the Policy Snapshot is produced** now that the full policy text is not sent to the model: a step in the ingestion workflow, or a separate call.
- **Whether Claims & Grievance (Playbook) questions also go through n8n**, and where the query router sits (in the app before calling n8n, or inside the RAG workflow).
- **Sync or async ingestion:** how the app learns that ingestion finished (callback webhook, polling, or Supabase Realtime).
- **Payment gateway** for UPI (the PRD names Razorpay only as an example).
- **SMS OTP provider**, plus the secondary provider and WhatsApp OTP fallback.
- **Fallback LLM provider** for outages.

The engineering doc must include a section for each of the two n8n flows (trigger, input and output contract, nodes in order, error handling, retries) and a sequence diagram for upload and for chat. It must also cover every component in the PRD (section 3): authentication, upload and text extraction, document classification, Policy Snapshot, policy chat, Claims & Grievance Guide, query router and safety layer, results display, and history, feedback and payments.

When done, show the user what was created and ask:
> "Both engineering documents are ready in `docs/engineering/`. Review them and let me know when you're happy to move to Stage 2."

---

### Stage 2 — Implementation Specs
**Skill:** `/implementation-specs`
**Input:** `docs/engineering/engineering-doc.md` (from Stage 1)
**Output:** `docs/specs/` — detailed spec files + `docs/specs/supabase-schema.sql` + `.env.example`

Read the approved engineering plan and generate granular, runnable implementation specs. The LLM decides what spec files are needed based on the plan. Always includes:
- `docs/specs/supabase-schema.sql` — paste-and-run SQL for the Supabase SQL Editor (tables, RLS policies, indexes, triggers, Storage bucket and Storage policies). Core tables from the PRD: `users`, `consents`, `policies`, `documents`, `snapshot_terms`, `chat_sessions`, `chat_messages`, `playbook_entries`, `answer_feedback`, `payments`
- `.env.example` — every environment variable the app needs, grouped by service (Supabase, n8n webhook URLs and secret, LLM, embeddings, OCR, SMS OTP, payments)
- `docs/specs/n8n-ingestion-workflow.md` and `docs/specs/n8n-rag-workflow.md` — one spec per flow: webhook path, auth, request and response JSON, node-by-node steps, failure and retry behaviour. The exported workflow JSON (one file covering both flows) goes in `docs/specs/n8n/`
- The vector table in `supabase-schema.sql` (if pgvector is chosen): chunk text, embedding, and the metadata columns `user_id`, `policy_id`, `document_id`, `page_number`, `chunk_index`, with an index and RLS

Specs that must exist for this product, in addition to whatever else the plan needs: OCR and per-page quality scoring, citation verifier, query router, safety layer, Playbook schema and retrieval, consent capture, and data deletion.

When done, show the user what was created and ask:
> "All implementation specs are in `docs/specs/`. The Supabase schema SQL is ready to run. Review the specs and let me know when you're ready for the spec review."

#### Spec review (before Stage 3)
**Skill:** `/prd-techspecs-reviewer`
**Input:** `docs/PolicySaathi_PRD.md` + `docs/engineering/` + `docs/specs/` + `.env.example`
**Output:** `docs/prd-techspecs-review-feedback.md`

Once the user has approved the Stage 2 specs, run the reviewer. It checks that the engineering docs and specs are a complete and exact translation of the PRD (nothing dropped, nothing added), that they follow the n8n architecture above (one workflow, two flows), and that they respect the Product Guardrails below. It audits only; it does not redesign and never edits the PRD.

- Verdict **APPROVED:** show the report and ask whether to move to Stage 3.
- Verdict **BLOCKED:** show the report, fix the listed items in the engineering docs or specs with the user's agreement, and re-run the reviewer. Do not start Stage 3 while the verdict is BLOCKED.

---

### Stage 3 — Frontend Setup
**Skill:** `/frontend-setup`
**Input:** Approved specs from Stage 2
**Output:** Scaffolded Next.js 14 (App Router) project in `policysaathi/` with full folder structure

Scaffold the Next.js project based on the folder structure and conventions defined in the specs. Confirm the project folder with the user before writing any files; the default is `policysaathi/` at the repository root. Set it up as a mobile-first, installable PWA.

When done:
> "Your Next.js app is scaffolded and running in `policysaathi/`. Folder structure is in place. Let me know when you're ready to move to Stage 4 — Feature Implementation."

---

### Stage 4 — Feature Implementation
**Input:** Spec files from `docs/specs/`
**Process:** Build one feature at a time

For each feature:
1. Read the relevant spec file(s) from `docs/specs/`
2. Tell the user which feature you are about to implement and what files will be created or changed
3. Wait for their confirmation before writing any code
4. Implement the feature
5. Confirm it is done and ask which feature to build next

**Use `/n8n-workflows` for the two features that call n8n** (items 2 and 5 below). It builds Flow 1 and Flow 2 from `docs/specs/n8n-ingestion-workflow.md` and `docs/specs/n8n-rag-workflow.md`, writes the server-side n8n client and the upload and chat routes that call the webhooks, and ends with its own test checklist (idempotent ingestion, cross-user isolation, wrong-secret rejection, delete cascade). Neither feature is done until that checklist passes.

Suggested order, following the PRD roadmap:
1. Phone OTP sign-in and consent screen
2. Upload (PDF and photos) and the call to n8n Flow 1 (Ingestion): text extraction, OCR with page quality score, chunking, embedding, vector storage, status back to the app
3. Document classification and missing-wording prompt
4. Policy Snapshot
5. Policy chat through n8n Flow 2 (RAG), with page citations and the citation verifier
6. Query router and safety layer
7. Claims & Grievance Guide (Playbook), reimbursement checklist, grievance letter draft
8. Document viewer, history, per-answer feedback
9. Hindi and Hinglish
10. Data deletion
11. Payments

> **Always apply `/design-system` when writing any frontend code.** All colors, spacing, typography, and component styles must come from the design system defined in `docs/design.md`.

When all features are implemented, ask:
> "All features are implemented. Ready to move to Stage 5 — Testing?"

---

### Stage 5 — Testing
**Input:** Implemented features from Stage 4
**Output:** Test suite covering unit, integration, and E2E flows

For each implemented feature:
1. Write unit tests for business logic and utility functions
2. Write integration tests for API routes and database interactions
3. Write E2E tests for critical user flows (OTP sign-in, consent, upload to snapshot, chat, deletion)
4. Run the full test suite and fix any failures before proceeding

Product-specific suites the PRD requires:
- **Safety suite:** claim-prediction requests, medical emergencies, medical advice, purchase advice and off-topic prompts. Target is 100%; it runs on every deploy.
- **Citation verifier tests:** a cited page that does not contain the clause must trigger one regeneration, then a "could not verify" notice.
- **"Not found" tests:** a question whose answer is not in the document must return "I can't find this in your documents".
- **Cross-account RLS tests:** one test user must never read another's policies, documents or chats.
- **n8n workflow tests:** ingestion writes chunks with correct page numbers and is idempotent on re-run; RAG never returns a chunk from another user's or another policy's documents; a workflow failure or timeout shows a clear error with retry; deleting a policy removes its chunks.
- **Retrieval tests:** for a set of questions with known answer pages, the right page is among the retrieved chunks.

Use synthetic or public policy documents in tests. Never commit a real person's policy.

When all tests pass, ask:
> "All tests are passing. Ready to move to Stage 6 — Deploy?"

---

### Stage 6 — Deploy
**Input:** Tested, passing codebase from Stage 5
**Output:** Live deployment on Netlify + Supabase

Steps:
1. Confirm environment variables are set in Netlify
2. Confirm the Supabase project is in an India region
3. Run the production build locally to catch any build errors
4. Deploy using `netlify.toml`
5. Smoke test the live deployment against critical flows, using test accounts and synthetic policies only
6. Confirm the app is live and working

This deployment is for internal testing. Do not invite real users or accept real policies until Stage 7 is approved.

When deployed and verified, ask:
> "App is live. Ready to move to Stage 7 — Security Fixes?"

---

### Stage 7 — Security Fixes
**Skill:** `/security-foundation`
**Input:** Live deployed app + all engineering docs and specs
**Output:** `docs/security/security-plan.md` + `supabase/rls-policies.sql` + `policysaathi/src/lib/security/`

Review all engineering and spec documents, audit the deployed app, identify every security surface, and implement all required security controls. Covers auth, protected routes, API validation, rate limiting (including OTP sends), prompt injection protection (uploaded documents are untrusted input), token limits, chat security, file upload security, environment variable protection, and audit logging.

Because policies carry health and financial data, also verify: consent is recorded before the first upload, signed URLs expire in 1 hour, hard deletion removes files, extracted text, chunks and embeddings, snapshot and chats, and no user content is logged in plain text.

For n8n specifically: webhooks reject calls without the shared secret, webhook URLs are not exposed to the client, n8n execution logs do not retain policy text longer than needed, and n8n credentials are stored in n8n's credential store, not in workflow JSON committed to the repo.

When done, show the user what was created and ask:
> "Security fixes are complete. All controls are documented in `docs/security/security-plan.md` and the service files are ready in `policysaathi/src/lib/security/`."

---

## Product Guardrails

These come from the PRD and apply to every spec, prompt and line of code. Do not weaken them without the user's explicit approval.

- **Two sources only.** Answers come from the user's uploaded documents or from the verified Playbook. The model's general insurance knowledge is never a source.
- **Every document answer cites `[Page X]`** and passes the citation verifier before display.
- **Source is always labelled.** "From your policy" for document answers; "General guidance, last verified <date>" for Playbook answers.
- **"Not found" is a valid answer.** Never guess a value or a clause.
- **No regulatory facts in code or prompts.** Claim timelines, grievance deadlines and Ombudsman limits live only in SME-verified Playbook entries. Do not hard-code them and do not write them from memory, including in seed data; use clearly marked placeholders until the SME supplies them.
- **The agent never** predicts claim approval, states a payable amount as certain, gives medical advice, or recommends buying, porting or cancelling a policy.
- **Emergency language** shows 112, advises going to the nearest hospital, and pauses the normal flow.
- **The agent never acts for the user.** It drafts letters; the user sends them.
- **Ingestion and policy chat go through n8n.** The app never chunks, embeds or calls the LLM for policy answers itself; it calls Flow 1 on upload and Flow 2 on a policy question.
- **Text is extracted once at upload**, chunked and embedded with page numbers kept on every chunk. Chat reads retrieved chunks, never the file.
- **Retrieval is always filtered by `policy_id` and `user_id`.** An unfiltered vector search is a data leak.
- **Numeric values from low-quality OCR pages are always flagged**, whatever the model's confidence.
- **Limits:** PDF, JPG, PNG; 20 MB and 60 pages per policy; up to 3 documents per policy.
- **Scope:** health indemnity policies only; English documents; conversation in English, Hindi and Hinglish.
- **Disclaimer on every screen with AI output**, using the exact text in PRD section 9.

---

## Skills Reference

| Skill | Command | What it does |
|---|---|---|
| Engineering Planner | `/engineering-planner` | PRD → `docs/engineering/engineering-doc.md` + `docs/engineering/implementation-specs.md` |
| Implementation Specs | `/implementation-specs` | Engineering docs → granular spec files + `supabase-schema.sql` + `.env.example` |
| PRD–Specs Reviewer | `/prd-techspecs-reviewer` | Audits engineering docs and specs against the PRD, the n8n architecture and the guardrails → `docs/prd-techspecs-review-feedback.md` |
| Frontend Setup | `/frontend-setup` | Scaffolds a Next.js 14 App Router project in `policysaathi/` |
| n8n Workflows | `/n8n-workflows` | Builds the ingestion and RAG workflows and wires the upload and chat routes to them → `docs/specs/n8n/` + `policysaathi/src/lib/n8n/` |
| Design System | `/design-system` | Enforces brand colors, typography, spacing, and component styles on all UI code |
| Security Foundation | `/security-foundation` | Implements all security controls → `docs/security/security-plan.md` + `supabase/rls-policies.sql` + `policysaathi/src/lib/security/` |

---

## Docs Reference

| File | Created by | Purpose |
|---|---|---|
| `docs/PolicySaathi_PRD.md` | User | Product requirements; source of truth |
| `docs/design.md` | User | Brand design system |
| `docs/engineering/engineering-doc.md` | `/engineering-planner` | High-level architecture, flows, DB design, API spec |
| `docs/engineering/implementation-specs.md` | `/engineering-planner` | Per-feature specs (flow, DB, API, component, edge cases) |
| `docs/specs/*.md` | `/implementation-specs` | Additional granular specs derived from the engineering docs |
| `docs/specs/supabase-schema.sql` | `/implementation-specs` | Run this in Supabase SQL Editor to create all tables |
| `docs/specs/n8n-ingestion-workflow.md` | `/implementation-specs` | Flow 1: chunk, embed and store an uploaded policy |
| `docs/specs/n8n-rag-workflow.md` | `/implementation-specs` | Flow 2: retrieve chunks and answer a policy question |
| `docs/specs/n8n/AgenticRAGWorkflow-Week-4.json` | `/n8n-workflows` drafts them; the user re-exports from n8n once the workflow runs | The single versioned workflow definition covering both flows, with credentials removed |
| `docs/specs/n8n/build-guide.md` | `/n8n-workflows` | Node-by-node guide for building both flows by hand if an import fails |
| `docs/prd-techspecs-review-feedback.md` | `/prd-techspecs-reviewer` | Coverage matrix, conformance checks and APPROVED / BLOCKED verdict |
| `.env.example` | `/implementation-specs` | All environment variables — copy to `policysaathi/.env.local` and fill in values |
| `docs/security/security-plan.md` | `/security-foundation` | Security controls, audit log, RLS policies |

---

## Key Constraints

- **Never skip a stage.** Each stage depends on the output of the previous one.
- **Never proceed without user approval.** After every stage, stop and wait.
- **Never assume missing decisions.** Use `AskUserQuestion` when something is unclear.
- **Never write code before the specs exist.** Implementation only starts after Stage 2 is approved and the spec review verdict is APPROVED.
- **Never use real policies or real user data before Stage 7 is approved.**
- **Never change the PRD without being asked.** If the PRD looks wrong or incomplete, say so and wait.
