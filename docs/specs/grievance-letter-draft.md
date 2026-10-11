# Grievance Letter Draft

**Implements:** US-012, FR-14
**API route:** `POST /api/playbook/letter-draft`

---

## Generation location: reuses the `Policy Orchestrator` → `claims_guide_agent` path

Matches the actual reference workflow's own prompt, which already anticipates this: `claims_guide_agent`'s system prompt states "If asked to draft a grievance letter, use only facts the user gave and Playbook," and its response-format rules add a note when the topic is grievance escalation ("I can draft the letter for you to review and send"). This spec routes letter requests through the same `Policy Orchestrator` → `claims_guide_agent` call as any other grievance-process question (`docs/specs/n8n-rag-workflow.md`), rather than building a second, separate n8n path — no new flow or node type is needed.

## Contract

**Request:**
```json
{
  "policy_id": "...",
  "claim_details": {
    "claim_number": "string, optional",
    "hospital_name": "string",
    "admission_date": "2026-09-01",
    "amount_claimed": "₹45,000",
    "reason_for_grievance": "string — user's own words describing what went wrong"
  }
}
```

**Response:**
```json
{ "letter_text": "To,\nThe Grievance Redressal Officer,\n...\n\n[full draft]" }
```

## Behavior

1. Validate `policy_id` belongs to the user and has a ready Snapshot.
2. Call n8n's `document_retrieval` webhook with the question framed as a letter-drafting request, the policy's known facts (insurer name if extractable, policy number if extractable, sum insured — from `snapshot_terms`) plus the user-supplied `claim_details`, so `Policy Orchestrator` routes to `claims_guide_agent` as it would for any grievance-topic question.
3. `claims_guide_agent` fills the letter using **only** facts that are either (a) extracted from the user's own policy document or (b) directly provided by the user in `claim_details`, plus any procedural reference actually returned by its Snowflake `CLAIMS_PLAYBOOK` query. **It never invents a claim timeline, grievance deadline, or Ombudsman reference** — the same "never state a deadline... not in the Snowflake record" rule from its system prompt (`docs/specs/n8n-rag-workflow.md`) applies here exactly as it does to a normal grievance question.
4. Return the draft as plain editable text.

## Guardrail: the agent never sends this for the user

There is **no** "send" action anywhere in this feature — only "copy" and "download" in the `LetterDraftEditor` component (`docs/engineering/implementation-specs.md` spec #7). This is enforced by omission: no email-sending, no API integration to any insurer/Ombudsman system exists in this codebase. The user must take the draft and send it themselves.

## Edge cases

- `claim_details.reason_for_grievance` containing something clearly out of scope (e.g. a request for medical advice framed as a grievance) → the Output Safety Screen (shared with chat, per `docs/specs/safety-layer.md`) should still apply to letter-draft generation, not just chat answers — flagged as a cross-cutting requirement, not something this spec can fully guarantee without Stage 4 wiring confirmation.
- Missing policy facts (e.g. policy number wasn't extractable from a low-quality scan) → the letter template uses a clearly marked blank (`[Policy Number — please fill in]`) rather than inventing one.
- A user requests a letter for a policy with no Snapshot yet (ingestion still processing) → `409 not_ready`, same pattern as chat sessions.

## Acceptance criteria

```
Given a policy with a known sum insured and the user's claim details
When POST /api/playbook/letter-draft is called
Then the returned letter_text includes the correct sum insured and the user-provided claim details, with no invented regulatory deadline

Given a policy number that could not be extracted during ingestion
When a letter is drafted
Then the letter contains a clearly marked blank for the policy number, not a guessed value

Given the generated letter
When reviewed against the product's guardrails
Then no API or UI action exists that could send it on the user's behalf — only copy/download
```
