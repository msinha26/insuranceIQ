---
name: engineering-planner
description: >
   Transforms the PolicySaathi PRD (or a feature request against it) into the engineering documents (High-Level Design plus per-feature specs). Trigger when a user asks to create an engineering document, engineering doc, HLD, system architecture, technical design, or wants to convert requirements into a technical plan. The output defines the application architecture, technology stack, the single n8n workflow and its two webhook flows (policy ingestion and policy RAG), data flow, APIs, database and vector store design, integrations, security and privacy considerations, deployment approach, and implementation roadmap before development begins. Outputs `docs/engineering/engineering-doc.md` and `docs/engineering/implementation-specs.md`.
---

## Fixed stack (do not ask about these)

- **Frontend:** Next.js 14 (App Router) + TypeScript, mobile-first installable PWA, in `policysaathi/`
- **Backend:** Next.js API routes (thin: authenticate, store, call n8n)
- **Platform:** Supabase in an India region (phone OTP auth, Postgres with row-level security, private storage, Realtime)
- **AI orchestration:** n8n. Policy ingestion and policy chat run in one n8n workflow with two flows, each called by its own server-side webhook (`document_ingestion` and `document_retrieval`). The app does not chunk, embed, or answer policy questions itself.
- **Hosting:** Netlify

There is no Azure AI Foundry in this project and no direct LLM SDK call for policy chat or ingestion.

`CLAUDE.md` ("Core Architecture" and "Product Guardrails") binds everything this skill writes. If the PRD and `CLAUDE.md` disagree, stop and ask.

---

## Input

`docs/PolicySaathi_PRD.md`. If it is not there, ask the user for the path.

---

## Steps

1. **Analyze** the PRD: extract functional requirements (keep the PRD's own ids, `FR-01`, `US-001`), non-functional requirements, constraints, and gaps.
2. **Resolve open decisions.** Use `AskUserQuestion` for every decision below. The PRD leaves them open on purpose; never assume one. Record each answer, with a one-line reason, in the document.
   - LLM provider and model tiers (larger tier for the Policy Snapshot, smaller tier for routing and simple turns), and the fallback provider
   - OCR vendor for scanned PDFs and phone photos
   - n8n Cloud or self-hosted, and its region
   - Vector DB: Supabase pgvector or a separate store
   - Embedding model and dimension (the same model for ingestion, retrieval and the Playbook)
   - Chunk size, overlap, and how sub-limit tables are kept whole
   - Whether OCR runs in the app or inside Flow 1
   - How the Policy Snapshot is produced
   - Whether Playbook questions also go through n8n, and where the query router, safety layer and citation verifier run
   - How the app learns ingestion finished (callback webhook, polling, or Supabase Realtime)
   - Payment gateway for UPI
   - SMS OTP provider, the secondary provider and the WhatsApp OTP fallback
3. **Generate** `docs/engineering/engineering-doc.md`.
4. **Generate** `docs/engineering/implementation-specs.md`.

---

## Output 1: `docs/engineering/engineering-doc.md`

Write this file with these sections in order:

1. **Executive Summary** — project name, business goal, problem statement, target users, success criteria
2. **Product Scope** — in scope / out of scope / future enhancements, matching the PRD exactly
3. **User Personas** — user types, primary workflows, device and language constraints
4. **User Flows** — every major journey (OTP sign-in, consent, upload, snapshot, policy chat, claims and grievance guidance, letter draft, history, payment, data deletion) using the format:
   ```
   User Action → Frontend Behavior → API Route → n8n Workflow (if any) → Database / Vector DB → System Response
   ```
5. **Frontend Architecture** — Next.js stack (UI lib, state management, routing), PWA setup, language handling (English, Hindi in Devanagari, Hinglish input), UX states (loading/empty/error/slow connection), page weight budget, page and component hierarchy
6. **Backend Architecture** — API routes, core systems (auth, consent gate, entitlement checks, validation, error handling), and a service interaction diagram showing browser, API routes, Supabase, n8n, OCR and LLM
7. **n8n Flow 1 — Policy Ingestion** and **n8n Flow 2 — Policy RAG** — one section each, opening with a short note that both flows live in a single n8n workflow and share its credentials and active switch:
   - Trigger, caller, authentication (shared secret header)
   - Input and output JSON contract
   - Nodes in order
   - Error handling, retries, timeout, and what the user sees on failure
   - Ingestion: idempotency rule (re-run replaces the document's chunks), page-first chunking, how status reaches the app
   - RAG: retrieval filtered by `user_id` and `policy_id` inside the vector query, top-k, similarity threshold, "not found" path
   - Latency: whether the chosen n8n setup can stream, and whether Netlify's function time limit fits the PRD's 3-second first-token and 12-second P95 targets. State the conflict plainly if there is one.
   - Hosting, region and execution-log retention for n8n
8. **Database and Vector Store Design** — per table: purpose, columns + types, relationships, constraints, indexes. Cover the PRD's core tables (`users`, `consents`, `policies`, `documents`, `snapshot_terms`, `chat_sessions`, `chat_messages`, `playbook_entries`, `answer_feedback`, `payments`), the chunk table (content, embedding with dimension, `user_id`, `policy_id`, `document_id`, `page_number`, `chunk_index`) and the similarity search function. State how deletion cascades to chunks.
9. **AI Architecture** — for each PRD component (authentication aside): upload and text extraction, document classification, Policy Snapshot, policy chat, Claims & Grievance Guide, query router and safety layer. For each: where it runs (n8n or app), model tier, prompt strategy, output schema, token limits, fallback. Include cost per upload and per chat turn against the PRD targets.
10. **API Specification** — per endpoint: method, path, purpose, auth required, request schema, response schema, validation rules, error responses
11. **Security and Privacy** — phone OTP, row-level security, tenant isolation in vector retrieval, webhook secrets, signed URLs, consent, deletion, retention, data location, vendor no-training terms (DPDP Act 2023)
12. **Feature Breakdown** — phased as in the PRD roadmap, each with: feature description, acceptance criteria, dependencies
13. **Folder Structure** — production-ready layout of `policysaathi/` with purpose annotations, including `src/lib/n8n/` and `src/lib/security/`
14. **Naming Conventions** — files, folders, components, hooks, services, APIs, DB tables, env vars, n8n workflows and nodes — with examples
15. **Testing and Evaluation Strategy** — unit, integration and E2E, plus the PRD's suites: safety, citation verifier, "not found", cross-account RLS, n8n workflow tests, retrieval recall
16. **Specs to Implementation Mapping** — for each spec that `/implementation-specs` will produce, the implementation files and the flow from spec to code

Two sequence diagrams are mandatory: one for upload, one for chat.

---

## Output 2: `docs/engineering/implementation-specs.md`

One spec block per feature, in the order of the Stage 4 list in `CLAUDE.md`. Each block has: user flow, DB schema touched, DB tasks, API routes, n8n workflow involved (if any), state management, component spec, design notes, edge cases, and the PRD ids it implements.

---

## Requirements

- No vague statements. Every section must be concrete and actionable.
- Do not add features the PRD does not contain. Anything out of PRD scope goes under "future enhancements" or is left out.
- **No regulatory facts.** Do not write claim timelines, grievance deadlines or Ombudsman limits from memory anywhere, including seed data and prompts. Use clearly marked placeholders until the SME supplies them.
- Every unverified number carried from the PRD (cost targets, token estimates) stays labelled as an assumption.
- If the PRD looks wrong or incomplete, say so and wait. Do not change the PRD.
- No implementation begins until both documents are approved.
