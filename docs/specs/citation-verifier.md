# Citation Verifier

**Implements:** FR-09 and the exact-sentence navigation requirement (every policy-document citation must resolve to a specific line the user can be taken to in the viewer, not just a page)
**Runs in:** n8n Flow 2 (`document_retrieval`), the `Citation Verifier` node (an addition beyond the literal reference template — see `docs/specs/n8n-rag-workflow.md`). This spec covers the surrounding contract, retry behavior, and frontend handling that file doesn't repeat.

> **V1 implementation gap (current live workflow):** the deployed ingestion (plain `pdfLoader`, no Azure OCR/line-marking) only produces a page number and a *line range* per chunk (`loc.pageNumber`, `loc.lines.from/to`) — not a single exact line and no `bounding_box`. The live `Verify And Shape Policy Answer` node checks a cited `[Page X, Line Y]` against whether `Y` falls inside a retrieved chunk's line range for that page (reject if not — no semantic re-check of the line's actual text), and **does not implement the single-regeneration retry** in "Verification logic" step 6–7 below: a failed citation goes straight to the "could not verify" fallback. `bounding_box` is always `null` until the OCR/line-marking ingestion pipeline (`docs/specs/n8n-ingestion-workflow.md`) is actually built. Full exact-sentence pixel navigation is not available until that happens.

---

## Purpose

Every document-sourced chat answer must cite a real **line on a real page**, and that specific line must actually support the specific claim — not merely exist somewhere in the retrieved set, and not merely be on the right page. This is the mechanism that makes the guardrail **"every document answer cites [Page X] and passes the citation verifier before display"** real, and extends it: the verifier is also what resolves each citation's exact position so a click can navigate straight to the sentence, not just scroll to the top of a page.

## Contract

**Input** (from `insurance_policy_agent`, via the `Policy Orchestrator`):
```json
{
  "draft_answer": "Your room rent is capped at 1% of sum insured per day [Page 14, Line 3].",
  "retrieved_chunks": [
    {
      "chunk_id": "7b2e...",
      "page_number": 14,
      "chunk_type": "text",
      "content": "[Page 14][Line 2] Room rent and accommodation charges.\n[Page 14][Line 3] Room rent: capped at 1% of the Sum Insured per day.\n[Page 14][Line 4] ICU charges: capped at 2% of the Sum Insured per day.",
      "lines": [
        { "line_number": 2, "text": "Room rent and accommodation charges.", "bounding_box": { "x": 0.12, "y": 0.40, "width": 0.5, "height": 0.02 } },
        { "line_number": 3, "text": "Room rent: capped at 1% of the Sum Insured per day.", "bounding_box": { "x": 0.12, "y": 0.44, "width": 0.76, "height": 0.02 } },
        { "line_number": 4, "text": "ICU charges: capped at 2% of the Sum Insured per day.", "bounding_box": { "x": 0.12, "y": 0.48, "width": 0.74, "height": 0.02 } }
      ]
    }
  ]
}
```
`chunk_type: "table"` chunks omit `lines[]` and instead carry a single top-level `bounding_box` for the whole table region (see Edge cases).

**Output:**
```json
{
  "verified": true,
  "final_answer": "Your room rent is capped at 1% of sum insured per day [Page 14, Line 3].",
  "citations": [{ "page": 14, "line_number": 3, "bounding_box": { "x": 0.12, "y": 0.44, "width": 0.76, "height": 0.02 }, "chunk_type": "text" }]
}
```
or, on failure:
```json
{ "verified": false, "reason": "Page 14, Line 3 does not exist among retrieved lines (hallucinated citation).", "regenerate": true }
```
or:
```json
{ "verified": false, "reason": "Page 14, Line 2 is a heading, not the room-rent figure the answer states.", "regenerate": true }
```
or, after the single regeneration also fails:
```json
{ "verified": false, "final": true, "final_answer": "I found something related, but I couldn't verify the exact page — please check the document viewer to confirm.", "citations": [] }
```

## Verification logic

1. Extract every `[Page X, Line Y]` token from `draft_answer`. (A `[Page X]` token with no line number is itself a failure — see Edge cases.)
2. For each, find the chunk in `retrieved_chunks` whose `page_number == X`, then find the entry in that chunk's `lines[]` whose `line_number == Y`.
3. If no matching chunk exists, or the chunk exists but has no line `Y` in its `lines[]` → fail immediately (hallucinated citation — this catches both "wrong page" and "right page, line not actually retrieved").
4. If the line exists, do a semantic check (LLM call, system prompt in `n8n-rag-workflow.md`) that **that specific line's `text`** actually supports the specific claim citing it — not just that the page/line reference resolves. This catches "right page, wrong line" errors (e.g. citing the line above or below the one that actually states the figure) as well as "right page, wrong fact" errors from the earlier page-only design.
5. If every citation passes both checks → for each, copy that line's `bounding_box` from the matched `lines[]` entry into the output `citations[]` array (this is the only place `bounding_box` is attached — it travels from OCR, through the chunk, to here, and nowhere else), and return `verified: true`.
6. If any citation fails → request exactly one regeneration from the Policy Orchestrator, with the failure reason included as context. Re-run steps 1–5 on the regenerated answer.
7. If the regenerated answer also fails → return the fixed "could not verify" notice (step above) and stop — no second regeneration (guardrail: "failure → 1 regeneration, then could not verify").

## `chunk_type: "table"` citations

A table chunk has no `lines[]` — a cited fact from a table cites the page and the table's own `bounding_box` as a whole (there is no finer locator than "this table"). The verifier's step 2/3 logic for a table-sourced citation checks only that the page matches a retrieved table chunk on that page; step 4's semantic check still applies (the table's `content` must support the claim). The viewer highlights the whole table region rather than a single line for these citations (`docs/specs/document-viewer-history-feedback.md`).

## Frontend handling

- `verified: true` → render normally; citation chips are tappable and carry `{page, line_number, bounding_box}` (or `{page, bounding_box}` for a table citation) so the viewer can jump to and highlight the exact sentence or table, not just the page.
- The "could not verify" notice → render as a distinct message style (not a normal answer bubble), with no citation chip (there's nothing precise enough to navigate to), and the `answer_feedback` thumbs-down is pre-selected as a soft nudge *(default — confirm with design)*.

## What this does NOT do

- It does not re-run retrieval. It only checks the citations against the chunks already retrieved for this turn.
- It does not check Playbook-sourced claims — Playbook answers are labelled "General guidance," cited by Snowflake `ENTRY_ID`/`SOURCE_LINK`, not by page/line, and are out of this spec's scope (see `docs/specs/playbook-schema-retrieval.md`).

## Edge cases

- A `[Page X]` citation with no line number at all (the model dropped the line marker) → treated as a failure in step 1, same regeneration path as a hallucinated citation — FR-09's citation requirement is only satisfied by a page **and** a navigable line/region, not a bare page number.
- Multiple citations in one answer, one correct and one hallucinated or line-mismatched → the whole answer fails verification, not just the bad citation (the regeneration must fix the entire answer).
- A citation to a page/line that exists in the document but wasn't part of this turn's retrieved set (the model "remembered" it from an earlier turn) → fails, because step 3 only looks at `retrieved_chunks` for the current turn.
- A sentence that wraps across two OCR lines (e.g. "Room rent is capped at 1% of the\n[next line]Sum Insured per day.") → the agent should cite the line where the specific figure/clause appears (per its prompt's instruction, `n8n-rag-workflow.md`); the verifier's semantic check allows a pass if that line, read with adjacent context from the same chunk, supports the claim — it is not required to be a grammatically complete sentence in isolation.

## Acceptance criteria

```
Given a draft answer citing [Page 14, Line 3] where line 3's text genuinely supports the claim
When the Citation Verifier runs
Then verified is true, and the output citations[] entry carries line 3's bounding_box

Given a draft answer citing [Page 20, Line 1] when no chunk with page_number 20 was retrieved
When the Citation Verifier runs
Then verified is false, one regeneration is requested

Given a draft answer citing [Page 14] with no line number at all
When the Citation Verifier runs
Then verified is false — a bare page citation is treated the same as a hallucinated one

Given a draft answer citing [Page 14, Line 2] where line 2 is a heading and line 3 actually states the room-rent figure
When the Citation Verifier runs its semantic check
Then verified is false (line-level match, not page-level, is required)

Given the regenerated answer also fails verification
When the Citation Verifier runs a second time
Then the fixed "could not verify" notice is returned, with an empty citations[] array, and no third attempt is made

Given a citation sourced from a chunk_type: "table" chunk
When the Citation Verifier runs
Then it checks the page and the table's own bounding_box (no line_number expected or required)
```
