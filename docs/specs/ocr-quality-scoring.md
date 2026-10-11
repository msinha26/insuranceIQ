# OCR and Per-Page Quality Scoring

**Implements:** FR-04, FR-05
**Runs in:** n8n Flow 1 (`document_ingestion`), nodes 4–5 — see `docs/specs/n8n-ingestion-workflow.md`.

---

## Purpose

Every page of every uploaded document gets a quality score, independent of how confident the Policy Snapshot or chat LLM later is about any value read from that page. This is a guardrail, not a nicety: **"Numeric values from low-quality OCR pages are always flagged, whatever the model's confidence."**

## Inputs

- Raw OCR output from Azure AI Document Intelligence (Layout model) for each page: recognized text, per-word/per-line confidence scores, detected table regions.
- The original page image resolution and any skew/blur signal the OCR vendor exposes.

## Score computation

For each page, compute `quality_score` (float, 0–1) from:
1. **Mean word confidence** — average of the OCR vendor's per-word confidence scores on that page (weight 0.6).
2. **Text density ratio** — recognized character count vs. an expected minimum for a policy page of that type *(default expectation: ≥200 characters for a non-cover page — tune after the 50-photo bake-off)* (weight 0.25).
3. **Table region completeness** — if a table was detected, whether every cell in its bounding box returned non-empty text (weight 0.15; this weight is 0 for pages with no detected table).

```
quality_score = 0.6 * mean_word_confidence + 0.25 * text_density_ratio + 0.15 * table_completeness
```

## Thresholds **[DEFAULT — tune during the 50-photo OCR bake-off]**

| Range | Label | Effect |
|---|---|---|
| `>= 0.85` | high | no flag |
| `0.6 – 0.85` | low | page is kept, but any numeric term later extracted from this page (Snapshot or chat citation) is flagged in the UI regardless of the extraction model's own confidence |
| `< 0.6` AND zero recovered text | unreadable | page is added to `unreadable_pages`; no Snapshot term or chat citation can ever cite this page (there is nothing to cite) |
| `< 0.6` with some recovered text | low (same as 0.6–0.85 band) | kept, flagged — some signal exists even if weak |

## Propagation

- `documents.ocr_quality` stores the per-page array: `[{ "page": 7, "quality_score": 0.52, "label": "low" }]`.
- `documents.unreadable_pages` stores the list of pages with zero recovered text.
- The Policy Snapshot extraction step (node 7 of Flow 1) receives the quality array and must set a `low_quality_source: true` flag on any `snapshot_terms` row whose `page_number` is in the "low" or "unreadable" band — **this flag is independent of the `confidence` field the LLM itself reports**, per the guardrail.
- The chat citation verifier (Flow 2) does the same for any `[Page X]` citation landing on a flagged page — the UI (per `docs/engineering/implementation-specs.md` spec #4) renders a `LowQualityFlag` badge regardless of how confident the model sounded.

## Edge cases

- A page that OCR's cleanly but contains a hand annotation or stamp over a number → the vendor's confidence score should already reflect this; if it doesn't, this is a known gap to monitor post-launch, not something this spec can fully prevent.
- A fully blank page (e.g. a divider page in the PDF) → `text_density_ratio` near 0, correctly lands in "unreadable," which is harmless since there's nothing to cite there anyway.
- A table that OCR recognizes as plain text instead of a table region → `table_completeness` term defaults to not applicable (weight redistributed to the other two terms) rather than penalizing the page incorrectly.

## Acceptance criteria

```
Given a page with 95% mean word confidence and no detected table
When quality scoring runs
Then quality_score >= 0.85 and the page is labelled "high"

Given a page where OCR returned zero characters
When quality scoring runs
Then the page appears in unreadable_pages, not merely flagged as low

Given a Policy Snapshot term sourced from a page labelled "low"
When the Snapshot is displayed
Then the term shows a low-quality flag even if the Snapshot extraction model reported confidence 0.95 for that term
```
