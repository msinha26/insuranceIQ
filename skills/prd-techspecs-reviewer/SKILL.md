---
name: prd-techspecs-reviewer
description: >
  Reviews the PRD, engineering documents, and implementation specs to verify completeness and scope fidelity. Run it after Stage 2 and before Stage 3. Triggers when a user asks to review, audit, or cross-check requirements against technical specs, or wants to confirm no requirements are missing and no out-of-scope work has been added. Reads docs/PolicySaathi_PRD.md, docs/engineering/, and everything in docs/specs/ (markdown specs, the SQL schema, and the two n8n workflow specs), then produces a structured review report at docs/prd-techspecs-review-feedback.md.
---

## Purpose

Ensure the technical specification is an exact, complete translation of the PRD — no requirements dropped, no scope added. This skill is the requirements traceability check between product and engineering before implementation begins. It audits; it does not redesign and it never edits the PRD.

---

## Inputs

| File | Description |
|---|---|
| `docs/PolicySaathi_PRD.md` | The PRD; source of truth for product behaviour |
| `CLAUDE.md` | "Core Architecture" and "Product Guardrails" |
| `docs/engineering/engineering-doc.md` and `implementation-specs.md` | Produced by `/engineering-planner` |
| `docs/specs/*` | Produced by `/implementation-specs`: `*.md`, `supabase-schema.sql`, `n8n-ingestion-workflow.md`, `n8n-rag-workflow.md` |
| `.env.example` | Environment variables |

If any input is missing, stop and tell the user which file is absent before proceeding.

---

## Instructions

### Step 1 — Extract PRD requirements

Read the PRD and build a list of every discrete requirement. **Keep the PRD's own ids** where they exist (`FR-01`, `US-001`). For requirements that have no id, assign `PRD-###`. Include:
- Functional requirements and user stories with their acceptance criteria
- Constraints (performance, upload limits, cost, scalability, security, regulatory, usability)
- The architecture rules for the two n8n flows (PRD section 6 calls them Workflow 1 and Workflow 2; they are built as two webhook flows inside one n8n workflow)
- Grounding, guardrail and safety behaviours (PRD sections 7 and 9)
- Explicit exclusions and out-of-scope statements

### Step 2 — Audit the engineering documents

Check every requirement against `docs/engineering/`:
- Is it covered? Fully, partially, or not at all?
- Is the approach consistent with the PRD intent?
- Do the documents introduce anything not in the PRD?
- Is every open decision listed under Stage 1 in `CLAUDE.md` answered?

### Step 3 — Audit the implementation specs

Read all files under `docs/specs/` and check every requirement against them:
- Is each requirement traceable to at least one spec?
- Are acceptance criteria addressed?
- Do the specs expand scope beyond what the PRD and engineering documents sanction?
- Do the specs CLAUDE.md requires exist: OCR and page quality scoring, citation verifier, query router, safety layer, Playbook schema and retrieval, consent capture, data deletion?

### Step 4 — n8n architecture conformance

Check these specifically. A failure on any is `MISSING`, not `PARTIAL`.

| Rule | Where to look |
|---|---|
| Every chunk stores user id, policy id, document id, page number, chunk index | Schema and ingestion spec |
| Retrieval is filtered by user id and policy id inside the query | RAG spec and similarity function |
| The browser never calls n8n; routes call the webhook with a server-side secret | API spec and `.env.example` |
| Ingestion is idempotent | Ingestion spec |
| Deleting a policy or account deletes its chunks and embeddings | Schema cascade and deletion spec |
| n8n unavailable gives a clear error with retry and the file is preserved | Upload and chat specs |
| The app does not chunk, embed, or answer policy questions itself | Engineering documents and all specs |
| The same embedding model is used for ingestion and retrieval | Both workflow specs |

Flag as `ADDED` any direct LLM SDK call for policy chat or ingestion in the app, any reference to Azure AI Foundry, and any leftover wording from the earlier full-context design (the whole policy text sent to the model on every turn).

### Step 5 — Product guardrail conformance

Check each guardrail in `CLAUDE.md` ("Product Guardrails") against the specs and prompts. In particular, flag as `ADDED` any claim timeline, grievance deadline or Ombudsman limit written into a spec, prompt or seed data instead of a marked placeholder.

### Step 6 — Classify every finding

| Label | Meaning |
|---|---|
| `MISSING` | A PRD requirement has no corresponding coverage in the engineering documents or specs |
| `PARTIAL` | A PRD requirement is addressed but incompletely or ambiguously |
| `ADDED` | The engineering documents or specs contain something not justified by the PRD (scope creep) |

### Step 7 — Write the review report

Produce `docs/prd-techspecs-review-feedback.md` using the structure below.

---

## Output: `docs/prd-techspecs-review-feedback.md`

### 1. Summary

One-paragraph verdict: is the technical spec a faithful translation of the PRD, or are there gaps and additions that must be resolved before implementation?

### 2. Coverage Matrix

| ID | Requirement (from PRD) | Engineering Docs | Implementation Specs | Status |
|---|---|---|---|---|
| FR-01 | … | Covered / Partial / Missing | Covered / Partial / Missing | PASS / MISSING / PARTIAL / ADDED |

### 3. n8n Architecture Conformance

The Step 4 table with a PASS or FAIL per rule and the file and section that proves it.

### 4. Product Guardrail Conformance

One row per guardrail with PASS or FAIL and the location.

### 5. Missing Requirements

For each `MISSING` finding:
- **ID**
- **Requirement:** Quote the PRD text verbatim
- **Gap:** What is absent
- **Recommendation:** What needs to be added

### 6. Partial Coverage

For each `PARTIAL` finding:
- **ID**
- **Requirement:** Quote the PRD text verbatim
- **What is covered:** Brief description
- **What is missing:** Specific gap
- **Recommendation:** What needs to be clarified or completed

### 7. Scope Additions (Out-of-PRD Work)

For each `ADDED` finding:
- **Location:** File and section where the addition appears
- **Addition:** What was added
- **Assessment:** Why this is not in the PRD
- **Recommendation:** Remove, defer, or raise a PRD change request

### 8. Overall Verdict

One of:
- **APPROVED** — Specs fully and faithfully implement the PRD. Safe to proceed to Stage 3 — Frontend Setup.
- **BLOCKED** — One or more MISSING or ADDED items must be resolved before implementation.

If BLOCKED, list the minimum set of changes required to reach APPROVED status.

---

## Requirements

- Quote PRD text verbatim when citing a requirement — do not paraphrase
- Every finding must reference both the PRD source and the spec location (file + section)
- Do not suggest implementation approaches — this skill audits scope only
- If the PRD is ambiguous on a requirement, flag it as PARTIAL and recommend the user clarify the PRD before proceeding
