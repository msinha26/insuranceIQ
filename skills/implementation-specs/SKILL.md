---
name: implementation-specs
description: >
  Takes the engineering documents produced by the engineering-planner skill
  (docs/engineering/engineering-doc.md and implementation-specs.md) and expands them
  into a full set of granular, runnable implementation specification files for
  PolicySaathi. Use this skill after engineering-planner has finished — it is the second
  step before any coding begins. Trigger when the user says things like "generate
  implementation specs", "create detailed specs from the plan", "I need the Supabase SQL
  schema", "give me the n8n workflow specs", "break down the engineering plan into
  buildable specs", or "what do I need to start building".
---

## Input

`docs/engineering/engineering-doc.md` and `docs/engineering/implementation-specs.md`.

---

## Steps

1. **Read** both engineering documents in full.
2. **Check** that every open decision listed in `/engineering-planner` Step 2 has an answer. If one is missing, stop and name it. Do not fill it with a guess and do not write "TBD".
3. **Identify** every distinct concern in the plan — features, integrations, data models, flows, workflows, infrastructure decisions.
4. **Decide** what spec files are needed. Apart from the required files below, derive the set from the plan itself.
5. **Generate** each spec file inside `docs/specs/`. Name each file clearly after what it specifies.

---

## Principles for generating specs

Each spec file must be:

- **Self-contained** — a developer can read it alone and know exactly what to build
- **Concrete** — no vague statements, no "TBD", no "as needed"
- **Runnable where applicable** — SQL must execute, API and webhook contracts must be precise, env vars must be real
- **Traceable** — each spec lists the PRD ids it implements (`FR-04`, `US-005`)

**No regulatory facts.** Claim timelines, grievance deadlines and Ombudsman limits are never written into a spec, a prompt or seed data. Use a clearly marked placeholder such as `<<SME: grievance response window>>`.

---

## Always include: `docs/specs/supabase-schema.sql`

A single SQL file that can be pasted into the **Supabase SQL Editor** and run on a fresh project without errors.

- Extensions (including `vector` when pgvector is the chosen vector DB)
- Custom enums and types (document class, document status, chat route)
- All tables in dependency order with columns, types, constraints and defaults. Core tables from the PRD: `users`, `consents`, `policies`, `documents`, `snapshot_terms`, `chat_sessions`, `chat_messages`, `playbook_entries`, `answer_feedback`, `payments`
- The chunk table (if pgvector): chunk text, embedding column whose dimension matches the chosen embedding model, `user_id`, `policy_id`, `document_id`, `page_number`, `chunk_index`
- The similarity search function, taking `user_id` and `policy_id` as required filter arguments with no default
- An index on the embedding column and on `(user_id, policy_id)`
- Foreign keys with `ON DELETE CASCADE` from user to policy to document to chunks, so deleting a policy or account removes its embeddings
- `updated_at` auto-update triggers for every table that has that column
- Row Level Security enabled on every table + all RLS policies
- Storage bucket creation (private) and Storage policies

If the vector DB is not Supabase, replace the chunk table and function with `docs/specs/vector-store.md` describing the collection, metadata fields, filter and delete-by-policy operation.

---

## Always include: `docs/specs/n8n-ingestion-workflow.md` and `docs/specs/n8n-rag-workflow.md`

One file per flow. The two flows live in a single n8n workflow (Flow 1 on webhook path `document_ingestion`, Flow 2 on `document_retrieval`). Each file must contain:
- Webhook path, method, authentication and response mode
- Exact request and response JSON, with types and an example
- Node-by-node steps with the key setting of each node
- Chunk size, overlap, embedding model, top-k and similarity threshold as numbers
- The full system prompt text (RAG workflow)
- Failure and retry behaviour: what is sent back on failure
- Idempotency rule (ingestion) and tenant filter (RAG)
- n8n credentials required, by name
- Acceptance tests in given/when/then form

These two files are the contract `/n8n-workflows` builds from. The exported workflow JSON (one file covering both flows) goes in `docs/specs/n8n/` with credentials removed.

---

## Always include: these product specs

- OCR and per-page quality scoring
- Citation verifier
- Query router
- Safety layer
- Playbook schema and retrieval
- Consent capture
- Data deletion (including chunks and embeddings)

---

## Always include: `.env.example`

At the repository root. It lists every environment variable the app needs, each with an inline comment explaining what it is and where to get it. It is copied to `policysaathi/.env.local`.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL — Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key — Settings > API
SUPABASE_SERVICE_ROLE_KEY=          # SERVER ONLY — Settings > API

# n8n
N8N_INGESTION_WEBHOOK_URL=          # SERVER ONLY — Production URL of the Policy Ingestion webhook
N8N_RAG_WEBHOOK_URL=                # SERVER ONLY — Production URL of the Policy RAG webhook
N8N_WEBHOOK_SECRET=                 # SERVER ONLY — sent by the app to n8n (Header Auth)

# Add every other variable the plan requires (LLM, embeddings, OCR, SMS OTP, payments, limits)
```

Rules:
- Values must be empty
- Group variables by service with a `# ServiceName` comment header
- Mark variables that must never reach the browser with `# SERVER ONLY`
- A key that is used only inside n8n belongs in n8n's credential store, not here. List those in a comment block titled `# Configured in n8n, not in this file`
- Cover every service in the engineering documents — nothing omitted

---

## After generating all files

Print a summary listing:
- Each file created with its path
- One sentence describing what it specifies
- The PRD ids it covers
