# Safety Layer

**Implements:** FR-11, plus the "Emergency language" and "Agent never acts for the user" guardrails
**Runs in:** n8n Flow 2 — `Emergency Pre-Check`, `Output Safety Screen`, plus the refusal rules embedded in `insurance_policy_agent`/`claims_guide_agent`'s own prompts. Full prompt text in `docs/specs/n8n-rag-workflow.md`.

---

## What the reference template does and doesn't cover

The reference workflow's two content agents (`insurance_policy_agent`, `claims_guide_agent`) already carry several FR-11 rules **inline in their own prompts**, verbatim:
- "Never say a claim will be approved or state a payable amount as certain."
- "Do not give medical advice or recommend buying, porting, or cancelling a policy."
- `claims_guide_agent` additionally: "Never predict an Ombudsman or court outcome, and do not advise on litigation."

What the reference template does **not** cover at all: emergency detection. There is no node, category, or prompt line anywhere in it that reacts to a medical emergency. Since "emergency shows 112, advises nearest hospital, pauses the normal flow" is a hard PRD guardrail, this spec adds it as a new, first node in the flow — this is the one place this build goes meaningfully beyond the literal reference template, not a reinterpretation of it.

## `Emergency Pre-Check` — deterministic, not an LLM call

Placed before `Intent Router`. A keyword/regex match (n8n `IF`/`Switch` node), chosen over an LLM classifier specifically to protect the 3-second first-token latency target for the single highest-stakes case — a deterministic check has no model-call latency at all. Seed keyword list (English + common Hindi/Hinglish phrasing, *expand during Stage 5*): "chest pain", "can't breathe", "cannot breathe", "unconscious", "bleeding heavily", "heart attack", "stroke", "saans nahi aa rahi", "behosh". On match: return the fixed response (full text in `docs/specs/n8n-rag-workflow.md`) and skip every other node — no retrieval, no Intent Router, nothing.

## `Output Safety Screen` — structural backstop, not a repeat of the prompt text

Placed after `Policy Orchestrator` (and after `Citation Verifier`), before `Respond to Webhook2`. Re-checks the **final** answer against the same FR-11 rules the content agents' prompts already try to enforce — this exists because a prompt rule inside `insurance_policy_agent` can be bypassed by a sufficiently unusual question or a retrieved document sentence that, quoted verbatim, reads like a guarantee; a second, independent check catches what the first prompt missed. This node does not re-run for the `general_question` branch (Branch A, `docs/specs/n8n-rag-workflow.md`) — MongoDB-sourced canned responses are pre-reviewed content, not model-generated, so there's nothing for this screen to catch there.

## Decision: general/off-topic handling is MongoDB-backed, NOT folded into a canned safety response

**This reverses an earlier draft's default.** An earlier version of this spec folded the off-topic path into a single fixed safety-layer string, reasoning that a database-backed responder added complexity. The actual reference template — and the user's explicit direction — keeps the dedicated `generic_question_agent`/MongoDB path (Section "Branch A", `docs/specs/n8n-rag-workflow.md`). This is simpler in practice, not more complex: `generalQuestionsCollection` is already populated and already part of the stack, so reusing it is less work than building and maintaining a second, separate fixed-string mechanism.

## "Emergency pauses the normal flow" — concretely

- The emergency response is returned with `route: null`, `safety_flag: "emergency"`.
- The frontend's `EmergencyBanner` (per `docs/engineering/implementation-specs.md` spec #6) replaces the normal chat input until explicitly dismissed — the next message does not auto-resume normal routing.
- No chat history is deleted — "paused," not "ended."

## "The agent never acts for the user"

Enforced structurally, not by prompt: there is no "send" action anywhere for the grievance letter feature (`docs/specs/grievance-letter-draft.md`) — only "copy" and "download." `claims_guide_agent`'s own prompt reinforces this: "NOTE: You file the complaint yourself. I can draft the letter for you to review and send" (shown to the user whenever the topic is grievance escalation).

## Edge cases

- A message that's both an emergency and a policy question ("chest pain, is this covered?") → emergency wins outright; the policy question is not answered in the same turn.
- A false-positive emergency trigger → accepted cost of erring toward safety; tune examples in Stage 5, never remove the over-triggering bias.
- A retrieved policy sentence that, quoted verbatim by `insurance_policy_agent`, reads like a guarantee ("the full amount will be reimbursed") → caught by `Output Safety Screen`, which operates on the final answer text regardless of why it was written that way.
- `claims_guide_agent`'s Snowflake row happens to be empty/missing for a topic → per `docs/specs/playbook-schema-retrieval.md`, this is a "no verified guidance yet" response, not a safety violation, but the Output Safety Screen should still pass it through unchanged (it contains no prohibited claim).

## Acceptance criteria

```
Given "I think I'm having a heart attack, what does my policy cover?"
When the message reaches the Emergency Pre-Check
Then the fixed 112 response is returned immediately and no other node (including Intent Router) executes

Given an insurance_policy_agent answer that restates a policy sentence reading "the full amount will be reimbursed"
When the Output Safety Screen reviews it
Then it is checked and, if it reads as a certainty guarantee, replaced with the fixed refusal

Given the off-topic/general_question design
When a user asks something unrelated to insurance
Then the response comes from generalQuestionsCollection via generic_question_agent, not a hardcoded safety-layer string

Given the grievance letter draft feature
When a user asks "send this letter to my insurer for me"
Then there is no code path that can fulfill this — the UI only offers copy/download, and claims_guide_agent's own prompt tells the user this explicitly when relevant
```
