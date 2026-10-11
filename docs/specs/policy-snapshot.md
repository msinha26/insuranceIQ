# Policy Snapshot

**Implements:** US-004, FR-07
**API route:** `GET /api/policies/[id]/snapshot`
**Produced by:** n8n Flow 1 (`document_ingestion`), node 7 (`Snapshot Extraction`) — see `docs/specs/n8n-ingestion-workflow.md`.

---

## Snapshot term list

Taken verbatim from PRD Flow 3, step 3 — corrected from an earlier draft of this spec that used a derived, non-PRD term list (flagged in `docs/prd-techspecs-review-feedback.md`'s FR-07 finding). Grouped exactly as the PRD groups them; the app's `src/lib/snapshot-terms.ts` is the single source of truth for term keys, labels, and grouping on the frontend.

| Group (PRD heading) | Term keys |
|---|---|
| Basics | `insurer`, `product_name`, `policy_type`, `policy_period`, `members_covered`, `sum_insured`, `tpa_name_and_helpline` |
| What reduces a claim | `room_rent_limit`, `icu_limit`, `co_pay`, `deductible`, `disease_wise_sub_limits`, `consumables_cover` |
| When cover starts | `initial_waiting_period`, `specific_disease_waiting_period`, `pre_existing_disease_waiting_period`, `maternity_waiting_period` |
| What else is covered | `pre_post_hospitalisation_days`, `daycare_procedures`, `ayush_cover`, `ambulance_limit`, `restoration_benefit`, `no_claim_bonus` |
| What is not covered | `key_exclusions` |
| Deadlines | `claim_intimation_window`, `reimbursement_submission_window` |

Each term produces exactly one `snapshot_terms` document: `{ term, value, page_number, line_number, bounding_box, confidence, source_sentence, is_not_found, low_quality_source }`.

## Extraction behavior

- Single LLM call (large tier) per policy, over the **full extracted text** (not retrieval) with `[DOC n][PAGE p][LINE l]` markers intact (`docs/specs/n8n-ingestion-workflow.md` node 4a), temperature `0.1`.
- For every term in the list: if the document states it, return `value`, `page_number` and **`line_number`** (the exact line the `source_sentence` starts on — the model is instructed to report the line marker it drew the value from, the same way `insurance_policy_agent` does for chat), `confidence` (0–1, model's self-reported certainty), and `source_sentence` (verbatim quote supporting the value, which may span beyond the single cited line — `line_number` is a navigation anchor, not a claim that the quote is exactly one line long).
- Ingestion node 7 then resolves `line_number` against node 4a's lookup table to attach `bounding_box` before writing the term — the same mechanism used for chat citations (`docs/specs/vector-store.md`, `docs/specs/citation-verifier.md`), so a Snapshot term and a chat citation navigate the viewer identically.
- If the document does not state a term: return `is_not_found: true`, `value: null`, `page_number: null`, `line_number: null`, `bounding_box: null` — **this is a valid, complete answer, not an extraction failure** (guardrail: FR-07 explicitly allows "Not found").
- If a term is stated differently on two pages (e.g. a schedule states one sum insured, an endorsement amends it) — **[open question, not resolved by this spec]**: the extraction prompt should be instructed to prefer the most recent/specific document (endorsement over schedule) and note the conflict in `source_sentence`, but the exact tie-break rule needs product-owner confirmation before Stage 4.

## Full extraction prompt (n8n Flow 1, node 7 — referenced but not previously written out)

```
You are the Policy Snapshot Extractor for a health insurance policy assistant.

You are given the full text of one or more uploaded policy documents, marked with
[DOC n][PAGE p][LINE l] before every line. Extract exactly these terms:

insurer, product_name, policy_type, policy_period, members_covered, sum_insured,
tpa_name_and_helpline, room_rent_limit, icu_limit, co_pay, deductible,
disease_wise_sub_limits, consumables_cover, initial_waiting_period,
specific_disease_waiting_period, pre_existing_disease_waiting_period,
maternity_waiting_period, pre_post_hospitalisation_days, daycare_procedures,
ayush_cover, ambulance_limit, restoration_benefit, no_claim_bonus, key_exclusions,
claim_intimation_window, reimbursement_submission_window

For each term, return a JSON object:
{ "term": "<term_key>", "value": "<string or null>", "page_number": <int or null>,
  "line_number": <int or null>, "confidence": <0-1 or null>,
  "source_sentence": "<verbatim quote or null>", "is_not_found": <boolean> }

RULES:
- Use ONLY the text provided. Never use your own knowledge of typical health insurance terms.
- If a term is not stated anywhere in the provided text, return is_not_found: true,
  value: null, page_number: null, line_number: null, confidence: null,
  source_sentence: null. This is a correct, complete answer — never guess or
  infer a plausible-sounding value.
- page_number and line_number must be the exact [PAGE p][LINE l] marker values from
  the line where source_sentence begins — copy them from the markers you were given,
  never estimate them.
- source_sentence must be an exact, verbatim quote from the provided text — never
  paraphrase, summarize, or combine multiple sentences into one quote.
- confidence reflects how certain you are that this is the correct, current value —
  not how important the term is.
- If the same term is stated differently in two places (for example, a schedule
  states one sum insured and a later endorsement states a different one), prefer the
  more specific/recent document (endorsement over schedule, schedule over wording for
  numeric facts) and note the discrepancy in source_sentence by quoting both.
- Never state a claim timeline, grievance deadline, or Ombudsman limit — those are
  never part of a policy's own Snapshot and must never be invented here regardless of
  context.
- Return a JSON array with exactly one object per term in the list above, in the order
  given — never fewer, never more.
```

Temperature `0.1`, output token limit `3,000` (per the PRD's Model Requirements table).

## `GET /api/policies/[id]/snapshot`

**Response:**
```json
{
  "terms": [
    { "term": "sum_insured", "value": "₹5,00,000", "page_number": 2, "line_number": 7, "bounding_box": { "x": 0.10, "y": 0.22, "width": 0.60, "height": 0.02 }, "confidence": 0.97, "source_sentence": "The Sum Insured under this Policy is ₹5,00,000.", "is_not_found": false, "low_quality_source": false },
    { "term": "maternity_cover", "value": null, "page_number": null, "line_number": null, "bounding_box": null, "confidence": null, "source_sentence": null, "is_not_found": true, "low_quality_source": false }
  ]
}
```
`404 not_ready` if `policies.status != 'ready'` yet.

## `low_quality_source` flag

Per `docs/specs/ocr-quality-scoring.md`: any term whose `page_number` falls on a page scored "low" or sourced despite being on an "unreadable" page carries `low_quality_source: true`, independent of the extraction model's own `confidence`.

## Edge cases

- A term where the model is confident (0.95) but the source page had low OCR quality → both fields are shown: high confidence AND the low-quality flag — the UI must not let one suppress the other.
- A policy where the wording document (needed for exclusions/sub-limits) wasn't uploaded, only the schedule → most financial terms (`sum_insured`, `room_rent_limit`) are found; `exclusions_summary` and similar wording-dependent terms are `is_not_found: true` — this is exactly the scenario the missing-wording prompt (`docs/engineering/implementation-specs.md` spec #3) exists to catch and explain to the user, not a bug in extraction.
- Snapshot Extraction fails after retries (per `n8n-ingestion-workflow.md`'s failure handling) → `GET /api/policies/[id]/snapshot` returns `404 not_ready` indefinitely for that policy until a retry succeeds; the UI should offer a manual "retry snapshot" action rather than leaving the user stuck — *(implementation detail for Stage 4, flagged here)*.

## Acceptance criteria

```
Given a policy document that explicitly states a sum insured of ₹5,00,000 on page 2, line 7
When Snapshot Extraction runs
Then the sum_insured term has value "₹5,00,000", page_number 2, line_number 7, a resolved bounding_box, and is_not_found false

Given a SnapshotTermCard for a found term
When the user taps it
Then the document viewer opens scrolled to page_number and highlights bounding_box — the same navigation behavior as a chat citation

Given a policy document with no mention of maternity cover anywhere
When Snapshot Extraction runs
Then the maternity_cover term has is_not_found true, not a guessed value

Given a term sourced from a page flagged "low" quality in docs/specs/ocr-quality-scoring.md
When the Snapshot is returned
Then low_quality_source is true for that term regardless of the model's own confidence score

Given a policy still in "processing" status
When GET /api/policies/[id]/snapshot is called
Then it returns 404 not_ready, not an empty terms array
```
