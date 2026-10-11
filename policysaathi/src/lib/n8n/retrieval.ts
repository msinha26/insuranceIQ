import { callN8nWebhook } from './client'
import type { ChatRoute, Citation } from '@/lib/mongodb/collections'

export interface RecentTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AskPolicyPayload {
  user_id: string
  policy_id: string
  // Named `message`, not `question` — the n8n workflow's nodes (Intent
  // Router, Query Rewriter, Policy Orchestrator, ...) all read
  // `$json.body.message`, inherited from the reference template this
  // workflow was built from.
  message: string
  recent_turns: RecentTurn[]
}

export type SourceLabel = 'from_policy' | 'playbook' | 'mixed' | 'none'

export interface AskPolicyResponse {
  answer: string
  route: ChatRoute | null
  citations: Citation[]
  source_label: SourceLabel
  not_found: boolean
  safety_flag: string | null
}

/**
 * STOPGAP: the live n8n workflow has no response-shaping or citation-verifier
 * step yet (docs/specs/citation-verifier.md) — every branch just returns the
 * raw LangChain agent output, `{ output: "..." }`, not this module's documented
 * contract. Until those nodes are built, this normalizes whatever shape comes
 * back so the chat UI has text to show. Citations, route, source_label, and
 * safety_flag will stay empty/default until n8n actually produces them — that
 * is a real gap against the "every answer cites a page" and "source is always
 * labelled" guardrails (CLAUDE.md), not something this function can fix.
 */
function normalizeAskPolicyResponse(raw: unknown): AskPolicyResponse {
  const record = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined

  const answer =
    typeof record?.answer === 'string' ? record.answer : typeof record?.output === 'string' ? record.output : ''

  return {
    answer,
    route: typeof record?.route === 'string' ? (record.route as ChatRoute) : null,
    citations: Array.isArray(record?.citations) ? (record.citations as Citation[]) : [],
    source_label: typeof record?.source_label === 'string' ? (record.source_label as SourceLabel) : 'none',
    not_found: typeof record?.not_found === 'boolean' ? record.not_found : false,
    safety_flag: typeof record?.safety_flag === 'string' ? record.safety_flag : null,
  }
}

/**
 * Calls n8n Flow 2 (document_retrieval) — docs/specs/n8n-rag-workflow.md.
 * user_id and policy_id must already be authenticated/ownership-checked by
 * the caller — n8n trusts them as-is and never re-derives them.
 */
export async function askPolicy(payload: AskPolicyPayload): Promise<AskPolicyResponse> {
  const url = process.env.N8N_RAG_WEBHOOK_URL
  if (!url) {
    throw new Error('Missing N8N_RAG_WEBHOOK_URL environment variable')
  }
  const raw = await callN8nWebhook<unknown>(url, payload)
  return normalizeAskPolicyResponse(raw)
}
