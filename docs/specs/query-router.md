# Query Router

**Implements:** FR-08
**Runs in:** n8n Flow 2 — two layers, full prompts in `docs/specs/n8n-rag-workflow.md`. This spec covers the two-layer design rationale and the eval-logging contract.

---

## Two layers, not one classifier (matches the actual reference workflow)

An earlier draft of this spec assumed a single 4-category classifier (`document|playbook|both|out_of_scope`). The actual reference workflow — and therefore this build — routes in **two distinct steps**:

1. **`Intent Router`** (a real classifier node): `insurance_policy_question` vs. `general_question`. Coarse, cheap, fast — decides whether this needs the policy/Playbook machinery at all, or is just off-topic chatter.
2. **`Policy Orchestrator`'s own prompt-driven reasoning** (not a second classifier node): for anything that passed layer 1 as `insurance_policy_question`, the orchestrator itself decides — by reading the *original* question against its routing instructions — whether to call `insurance_policy_agent`, `claims_guide_agent`, or both.

This two-layer shape is deliberate in the reference template: layer 1 is a cheap gate that lets "Hi" skip the entire policy/Playbook pipeline; layer 2 is where the real policy-vs-process distinction happens, done by the same agent that will act on the decision (reduces one network hop and one place for the routing decision to drift from the acting agent's own understanding).

## Decision: both layers run inside n8n, not the Next.js app

Unchanged from the previous design: routing is an LLM-touching step, so it stays inside n8n — the app never makes this call itself (guardrail: "the app never calls the LLM").

## Logging for eval

Both layers' decisions should be logged for the PRD's router-accuracy measurement (target ≥95%, *assumption from PRD*):
```json
{ "message_id": "ObjectId", "layer1_category": "insurance_policy_question", "layer2_tool_calls": ["insurance_policy_agent"], "timestamp": "..." }
```
**[Addition, not in the reference template]** written to a `router_eval_log` MongoDB collection by a lightweight logging node immediately after each layer resolves — win or lose, not just failures, since eval needs the full distribution.

## Failure handling

If `Intent Router`'s classifier call itself errors (not a low-confidence classification — an actual failure): fail closed to the `general_question` branch's fixed fallback ("I can only help with questions about your health insurance policy, claims, and grievances...") rather than guessing or attempting the heavier policy/Playbook path on a shaky signal.

## Edge cases

- A message ambiguous between `insurance_policy_question` and `general_question` (e.g. "can you read my policy?") → the Intent Router's own category description explicitly classifies capability questions like this as `general_question` — confirmed by the reference's example list.
- Within layer 2, a question ambiguous between `insurance_policy_agent` and `claims_guide_agent` (e.g. "what happens if my claim is rejected for a waiting period" — policy fact or process guidance?) → the orchestrator's own prompt lists this exact pattern under `BOTH`, calling both tools rather than guessing one.
- Hinglish/Hindi phrasing doesn't change which layer fires — both the Intent Router and the orchestrator operate on meaning, not language (the Query Rewriter's translation happens *after* layer 1, so layer 1 itself must handle Hindi/Hinglish input directly — confirmed workable since the reference's own `general_question` examples include "Namaste", "Aap kya kar sakte ho?").

## Acceptance criteria

```
Given "What is my sum insured?"
When Intent Router classifies it
Then the category is insurance_policy_question, and the Policy Orchestrator subsequently calls insurance_policy_agent

Given "How do I file a reimbursement claim?"
When routing completes
Then layer 1 is insurance_policy_question, and layer 2 (the orchestrator) calls claims_guide_agent, not insurance_policy_agent

Given "Namaste, aap kaise ho?"
When Intent Router classifies it
Then the category is general_question, and neither insurance_policy_agent nor claims_guide_agent is ever invoked

Given every routing decision made in a day, across both layers
When the eval pipeline reads router_eval_log
Then every decision is present, not just the ones that later proved wrong
```
