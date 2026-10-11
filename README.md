# dev-os

A structured AI-assisted development operating system for building production-ready apps — from idea to deployed product using a stage-gated workflow enforced through Claude Code skills.

---

## What This Is

`dev-os` is a Claude Code project that provides a repeatable, stage-by-stage workflow for building full-stack web applications. Each stage has a dedicated skill that Claude runs when invoked. No stage begins until the previous one is approved.

The current application target is **PolicySaathi** (placeholder name) — a chat platform where patients and families in India upload a health insurance policy, ask questions in English, Hindi or Hinglish, and get answers that cite the page, plus verified guidance on claims and grievance escalation.

---

## How It Works: One n8n Workflow, Two Flows

The Next.js app is the interface. Document processing and question-answering run in **n8n**, in a single workflow (currently named `AgenticRAGWorkflow-Week-4`) that contains two independent flows, each started by its own webhook. The PRD calls them Workflow 1 and Workflow 2.

| | Flow 1 — Policy Ingestion | Flow 2 — Policy RAG |
|---|---|---|
| **When it runs** | The user uploads a policy document | The user asks a question about the policy in chat |
| **Webhook** | `POST /webhook/document_ingestion` | `POST /webhook/document_retrieval` |
| **Called by** | Upload API route (server-side webhook call) | Chat API route (server-side webhook call) |
| **What it does** | Extracts text, splits it into chunks, embeds each chunk, stores chunks and embeddings in the vector DB | Embeds the question, retrieves the best-matching chunks for that policy, sends them with the question to the LLM |
| **Returns** | Status (`processing`, `ready`, `failed`) and chunk count | The answer, with page citations from the retrieved chunks |

```
Upload:  User → Next.js → Supabase Storage → n8n Ingestion → chunk → embed → vector DB
Chat:    User → Next.js → n8n RAG → retrieve chunks (this policy only) → LLM → answer + [Page X]
```

Three things hold this together:
- **Every chunk keeps its page number**, so every answer can cite the page.
- **Retrieval is filtered by user and policy**, so one family never sees another's policy.
- **The browser never calls n8n.** The API route authenticates the user, then calls the webhook with a server-side secret.

> The PRD (sections 4, 6, 7 and 8) describes the same two flows, under the names Workflow 1 and Workflow 2. An earlier PRD draft passed the full policy text to the model with no chunked retrieval; that design is no longer in use.

---

## Folder Structure

```
dev-os/
├── .claude/                      # Claude Code local settings
├── policysaathi/                 # The Next.js app (created in Stage 3)
├── docs/
│   ├── engineering/              # Stage 1 output: engineering-doc.md, implementation-specs.md
│   ├── specs/                    # Stage 2 output: spec files + supabase-schema.sql
│   │   └── n8n/                  # Exported n8n workflow JSON (one file, both flows)
│   ├── PolicySaathi_PRD.md       # Product Requirements Document for PolicySaathi
│   └── design.md                 # Brand design system (colors, typography, spacing, components)
├── skills/                       # Claude Code custom skills (slash commands)
│   ├── engineering-planner/
│   │   └── SKILL.md              # Stage 1: PRD → engineering docs
│   ├── implementation-specs/
│   │   └── SKILL.md              # Stage 2: Engineering docs → granular specs + SQL
│   ├── frontend-setup/
│   │   └── SKILL.md              # Stage 3: Scaffold Next.js 14 App Router project
│   ├── design-system/
│   │   └── SKILL.md              # Applied during all frontend work — enforces design.md
│   └── security-foundation/
│       └── SKILL.md              # Stage 7: Security controls + RLS policies
├── .env.example                  # Environment variables, grouped by service (Stage 2 output)
├── .gitignore
├── CLAUDE.md                     # Project instructions & stage-gated workflow rules
├── netlify.toml                  # Netlify build and deploy config
└── README.md
```

> `policysaathi/`, the contents of `docs/engineering/` and `docs/specs/`, `docs/security/`, `supabase/` and `.env.example` are generated outputs — they are created during the build workflow and do not exist until their respective stage runs.

---

## The Build Workflow

Each stage must be completed and approved before the next begins. `CLAUDE.md` has the full rules for each stage.

| Stage | Skill | Input | Output |
|---|---|---|---|
| 1 — Engineering Plan | `/engineering-planner` | `docs/PolicySaathi_PRD.md` | `docs/engineering/engineering-doc.md` + `docs/engineering/implementation-specs.md` |
| 2 — Implementation Specs | `/implementation-specs` | Stage 1 docs | `docs/specs/*.md` + `docs/specs/supabase-schema.sql` + `.env.example` |
| 3 — Frontend Setup | `/frontend-setup` | Stage 2 specs | Scaffolded Next.js 14 app in `policysaathi/` |
| 4 — Feature Implementation | *(manual, one feature at a time)* | `docs/specs/*.md` | Feature code |
| 5 — Testing | *(manual)* | Stage 4 code | Unit, integration, E2E and safety test suites |
| 6 — Deploy | *(manual)* | Passing codebase | Live deployment on Netlify + Supabase (internal testing only) |
| 7 — Security Fixes | `/security-foundation` | Deployed app + all docs | `docs/security/security-plan.md` + `supabase/rls-policies.sql` + `policysaathi/src/lib/security/` |

---

## Skills

Skills live in `skills/<name>/SKILL.md` and are invoked as slash commands in Claude Code.

### `/engineering-planner`
Transforms the PRD into two engineering documents. Asks clarifying questions before generating anything. For PolicySaathi the open decisions are n8n hosting and region, the vector DB, embedding model, chunking strategy, LLM provider and model tiers, OCR vendor, payment gateway and SMS OTP provider. The output must specify both n8n flows. Output is the authoritative reference for all downstream stages.

### `/implementation-specs`
Reads the approved engineering docs and generates granular, runnable specs — one file per concern. Always produces `supabase-schema.sql` (paste-and-run SQL) and `.env.example` (all environment variables grouped by service).

### `/frontend-setup`
Scaffolds a complete Next.js 14 (App Router) project in `policysaathi/` — `package.json`, `next.config.mjs`, `app/layout.jsx`, `app/globals.css`, `app/page.jsx` — and runs the dev server.

### `/design-system`
Enforces the brand design system defined in `docs/design.md` on all frontend code. Applied automatically whenever any UI component, page, or style is written. `docs/design.md` must be written for PolicySaathi before Stage 3; do not reuse the ContractIQ palette and fonts without deciding to.

### `/security-foundation`
Reviews all engineering and spec documents, audits the deployed app, identifies every security surface, and implements controls. Covers auth, rate limiting, prompt injection, token limits, file upload validation, RLS policies, and environment variable protection. For PolicySaathi it also checks consent capture, signed-URL expiry and hard deletion, because policies carry health and financial data.

---

## Key Rules

- **Never skip a stage.** Each stage depends on the output of the previous one.
- **Never proceed without user approval.** Claude stops after every stage and waits.
- **Never write code before specs exist.** Implementation only starts after Stage 2 is approved.
- **Always apply the design system** when writing any frontend code.
- **No real policies or real users before Stage 7 is approved.** Health data stays out until the security controls are in.
- **No regulatory facts outside the Playbook.** Claim and grievance timelines and limits come only from SME-verified Playbook entries.

---

## Current Project: PolicySaathi

A direct-to-consumer product for patients and families in India, health insurance only. The PRD is at `docs/PolicySaathi_PRD.md`.

What the MVP does:
- **Upload:** policy PDFs, scans and phone photos; up to 20 MB, 60 pages and 3 documents per policy. Each upload triggers the n8n ingestion workflow
- **Policy Snapshot:** key terms (room rent limit, co-pay, sub-limits, waiting periods, exclusions, deadlines) with page and confidence
- **Policy chat:** each question triggers the n8n RAG workflow; answers in English, Hindi and Hinglish from the uploaded documents only, each with a verified page citation
- **Claims & Grievance Guide:** cashless and reimbursement steps and the escalation ladder, from a versioned, SME-verified Playbook, labelled separately from policy answers; drafts grievance letters for the user to send

What it does not do: predict claim approval, give medical advice, recommend, compare or sell insurance, or act for the user with an insurer.

Tech stack:
- **Frontend:** Next.js 14 (App Router), mobile-first installable PWA
- **Backend:** Next.js API Routes (serverless) for auth, upload and calling n8n; keys and webhook secrets never reach the client
- **Orchestration:** n8n — one workflow with two webhook flows: Flow 1 (ingestion: chunk, embed, store) and Flow 2 (RAG: retrieve, answer); hosting to be decided at Stage 1
- **Vector DB:** stores policy chunks and embeddings with page metadata; Supabase pgvector or a separate store, to be decided at Stage 1
- **Database:** Supabase, India region (PostgreSQL with RLS + phone OTP Auth + Storage + Realtime)
- **AI:** LLM and embedding model chosen by bake-off on the eval set (not fixed in the PRD)
- **OCR:** vendor to be decided at Stage 1
- **Payments:** UPI through a payment gateway (to be decided at Stage 1)
- **Hosting:** Netlify (`netlify.toml`)
- **UI:** Lucide React icons; colors and fonts per `docs/design.md`

Open before public launch (from the PRD's assumptions): a regulatory opinion on whether IRDAI registration is needed, legal review of DPDP Act obligations, and an insurance SME on retainer for the Playbook.
