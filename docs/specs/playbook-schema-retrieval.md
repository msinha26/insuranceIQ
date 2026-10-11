# Playbook Schema and Retrieval — Snowflake

**Supersedes:** the earlier pgvector-based version of this spec (Supabase is not used — see `docs/engineering/engineering-doc.md`'s architecture note).
**Implements:** FR-10, US-006, US-007
**Runs in:** n8n Flow 2, `claims_guide_agent` tool, called by the `Policy Orchestrator` — see `docs/specs/n8n-rag-workflow.md`.

---

## The Playbook is Snowflake, not a vector store, and it is not seeded by this codebase

Per the user's explicit instruction: **the Claims & Grievance Playbook data is already ingested in Snowflake.** This spec documents the existing table's shape (as shown by the reference workflow's actual query) so the `claims_guide_agent` tool can be built against it correctly — it is **not** a migration or seed script this codebase runs, and this codebase never writes to this table.

## Table — `POLICY_DB.PUBLIC.CLAIMS_PLAYBOOK` (pre-existing, read-only from this app)

| Column | Type (assumed from usage) | Meaning |
|---|---|---|
| `ENTRY_ID` | number/string | primary identifier, used for stable ordering |
| `TOPIC` | string, one of `CASHLESS, REIMBURSEMENT, DEDUCTION, REJECTION, GRIEVANCE` | the fixed category this entry answers |
| `SITUATION` | string | plain description of when this entry applies |
| `STEPS` | string (likely newline/numbered) | what to do, in order |
| `DOCUMENTS_REQUIRED` | string | documents needed for this situation |
| `TIME_LIMIT` | string | **SME-authored content** — this app never writes or invents a value for this column; see the no-regulatory-facts guardrail below |
| `WHERE_TO_FILE` | string | escalation destination |
| `SOURCE_LINK` | string | citation for the guidance |
| `LAST_VERIFIED_DATE` | date | shown to the user as part of the mandatory "General guidance, last verified..." label |
| `VERIFIED_BY` | string | internal SME attribution, not necessarily shown to the user |

## Retrieval — plain SQL, not vector search

This is the key architectural difference from the earlier version of this spec: there is **no embedding, no similarity search, no top-k** for the Playbook. The `claims_guide_agent` tool runs:

```sql
SELECT
  ENTRY_ID, TOPIC, SITUATION, STEPS, DOCUMENTS_REQUIRED,
  TIME_LIMIT, WHERE_TO_FILE, SOURCE_LINK, LAST_VERIFIED_DATE, VERIFIED_BY
FROM POLICY_DB.PUBLIC.CLAIMS_PLAYBOOK
WHERE TOPIC = '{{ $fromAI("topic", "Classify the user question into exactly one of these values: CASHLESS, REIMBURSEMENT, DEDUCTION, REJECTION, GRIEVANCE", "string") }}'
ORDER BY ENTRY_ID
LIMIT 10;
```

The tool's own LLM call classifies the user's question into exactly one of the five fixed `TOPIC` values (via `$fromAI`), then this single categorical filter — not a semantic similarity score — determines which rows come back. Up to 10 rows are returned and the agent synthesizes across them if more than one is relevant.

## Why this is a stronger no-regulatory-facts guardrail, not a weaker one

Because this table is entirely external and SME-managed, there is **no seed data, no placeholder, and no path in this codebase that could ever write a claim deadline or Ombudsman limit from memory** — the risk that existed when this spec assumed a Supabase `playbook_entries` table seeded by developers (requiring `<<SME: ...>>` placeholders during development) doesn't apply here at all. The only remaining responsibility for this codebase is: **never let the LLM state a `TIME_LIMIT`-shaped fact that didn't come from an actual returned row** — enforced by the `claims_guide_agent` system prompt's rule "Never state a deadline, time limit, amount, or forum that is not in the Snowflake record" (full prompt text in `docs/specs/n8n-rag-workflow.md`).

## Frontend display

Every `claims_guide_agent`-sourced answer is labelled **"General guidance, last verified `<LAST_VERIFIED_DATE>`"** (`PlaybookSourceLabel` component, per `docs/engineering/implementation-specs.md` spec #7) — visually distinct from `insurance_policy_agent`'s "From your policy" label.

## Edge cases

- `TOPIC` classification is ambiguous (e.g. "my claim got reduced, not fully rejected" — is that `DEDUCTION` or `REJECTION`?) → the classifying LLM call picks one; if the wrong one is picked, the user gets a plausible-but-not-ideal set of rows rather than nothing — this is a router-accuracy concern to measure in eval, not something the SQL filter itself can hedge against (no multi-topic `IN (...)` fallback is built in this version).
- Zero rows returned for a valid topic (the table simply has no entry for it yet) → `claims_guide_agent` must say it doesn't have verified guidance on this yet, never fall back to general LLM knowledge about insurance processes.
- `TIME_LIMIT` or another column is `NULL`/empty for a matched row → the agent's response format should omit that line entirely rather than printing "Time Limit: null" or inventing a plausible-sounding value.

## Acceptance criteria

```
Given a question classified as topic REIMBURSEMENT
When claims_guide_agent runs its SQL
Then only rows with TOPIC = 'REIMBURSEMENT' are returned, ordered by ENTRY_ID

Given a matched row with a populated TIME_LIMIT
When the agent answers
Then the stated time limit is copied verbatim from that row, never rounded, rephrased, or supplemented from the model's own knowledge

Given a topic with zero matching rows
When claims_guide_agent runs
Then the response states verified guidance isn't available yet, not a general-knowledge answer about claims processes

Given this codebase's own files
When searched for any hard-coded claim deadline, grievance window, or Ombudsman limit
Then none exist anywhere — every such fact comes only from a live Snowflake row at answer time
```
