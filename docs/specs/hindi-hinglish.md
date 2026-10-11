# Hindi and Hinglish Conversation

**Implements:** US-009, FR-12
**Runs in:** n8n Flow 2's `AI Node — Query Rewriter` and `Policy Orchestrator`/`insurance_policy_agent` prompts (`docs/specs/n8n-rag-workflow.md`) + frontend i18n (`docs/engineering/engineering-doc.md` §5)

---

## Scope boundary

This is a **conversation-language** feature, not a document-language or UI-chrome-language feature:
- Policy **documents** are English only (PRD scope) — nothing here translates or re-OCRs documents.
- UI **chrome** (buttons, labels, nav) ships in English and Hindi via `src/lib/i18n/{en,hi}.json`, chosen independently by the user in account settings — this is a static dictionary swap, not an AI feature.
- Chat **conversation** language is detected per-turn by the LLM itself (no client-side language-detection library) and the reply matches whatever the user just typed — English, Hindi (Devanagari), or Hinglish (Latin-script Hindi/English mix).

## Behavior

- **Translation happens at the Query Rewriter, before retrieval** — its system prompt (full text in `docs/specs/n8n-rag-workflow.md`) explicitly instructs: "The policy documents are in English. If the question is in Hindi or Hinglish, rewrite it in English. Translate faithfully; do not add or drop anything," with worked examples (`"Papa ka knee replacement cover hoga kya?"` → `"Is knee replacement surgery for my father covered in the policy?"`). This resolves what an earlier draft of this spec flagged as an unmitigated cross-lingual retrieval risk — the actual reference design doesn't rely on the embedding model's own multilingual capability at all, because retrieval always runs against an **English** rewritten query, regardless of what language the user typed in.
- **Reply language matching happens at `insurance_policy_agent`** — its system prompt: "Reply in the user's language (English, Hindi, or Hinglish). Quote policy clauses in the original English, then explain." — rendered via the `ClauseQuoteBlock` component (`docs/engineering/implementation-specs.md` spec #9).
- Each turn is judged independently — a user may ask turn 1 in English and turn 2 in Hindi; the assistant is not forced to stay consistent across the session (FR-12 says "matching the user's turn," not the whole session).
- `Intent Router` and `Emergency Pre-Check` (layer 0/1, before the Query Rewriter runs) must still work directly on Hindi/Hinglish input, since translation hasn't happened yet at that point — confirmed workable for the Intent Router since its own category descriptions already include Hindi examples ("Namaste", "Aap kya kar sakte ho?"); the Emergency Pre-Check's keyword list (`docs/specs/safety-layer.md`) must include Hindi/Hinglish emergency phrasing for the same reason.

## Edge cases

- Mixed-language single message ("sum insured kitna hai for cashless claim") → the router/orchestrator must still extract the right intent and retrieve correctly; this is exactly the Hinglish case the feature targets, and quality here is what the PRD's "Hindi/Hinglish quality ≥90% acceptable" target (*assumption, from PRD*) measures.
- A Devanagari question containing an English policy term verbatim ("room rent kitna hai") → the English term should still match retrieval correctly since it's not translated.
- A user switches the UI chrome to Hindi but types chat questions in English → fully independent; no forced consistency (see Scope boundary above).

## Acceptance criteria

```
Given a question typed entirely in Devanagari Hindi
When the Policy Orchestrator answers
Then the reply is in Hindi, with any quoted policy clause shown in English inside a distinct quote block

Given a Hinglish question mixing English policy terms
When the Query Rewriter translates it and retrieval runs
Then the rewritten query is in English and the correct policy chunk is retrieved and cited

Given turn 1 in English and turn 2 in Hindi within the same session
When each turn is answered
Then turn 1's reply is in English and turn 2's reply is in Hindi, independently

Given the UI chrome language is set to Hindi
When the user types a chat question in English
Then the chat reply is in English regardless of the UI chrome language setting
```
