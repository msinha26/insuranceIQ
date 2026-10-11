import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { letterDraftSchema } from '@/lib/security/validate'
import { policiesCollection } from '@/lib/mongodb/collections'
import { withUserFilter } from '@/lib/security/tenant-filter'
import { askPolicy } from '@/lib/n8n/retrieval'
import { logError } from '@/lib/security/sanitize-log'

interface ClaimDetails {
  claim_number?: string
  hospital_name: string
  admission_date: string
  amount_claimed: string
  reason_for_grievance: string
  contested_clause?: { text: string; page: number }
}

/**
 * Frames the letter request as a chat question so it routes through the
 * same Policy Orchestrator -> claims_guide_agent path as any other
 * grievance question (docs/specs/grievance-letter-draft.md) — there is no
 * separate n8n contract for this.
 */
function buildLetterDraftQuestion(claimDetails: ClaimDetails): string {
  const lines = [
    'Please draft a grievance letter for me, using my policy details and the facts below.',
    `Hospital: ${claimDetails.hospital_name}`,
    `Admission date: ${claimDetails.admission_date}`,
    `Amount claimed: ${claimDetails.amount_claimed}`,
    `Claim number: ${claimDetails.claim_number ?? 'not provided'}`,
    `What happened: ${claimDetails.reason_for_grievance}`,
  ]
  if (claimDetails.contested_clause) {
    lines.push(
      `The clause I am contesting (page ${claimDetails.contested_clause.page}): "${claimDetails.contested_clause.text}"`
    )
  }
  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'invalid_request', message: 'Request body must be JSON.' }, { status: 400 })
  }

  const parsed = letterDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'invalid_request', message: 'Claim details are required.' }, { status: 400 })
  }

  let policyObjectId: ObjectId
  try {
    policyObjectId = new ObjectId(parsed.data.policy_id)
  } catch {
    return NextResponse.json({ code: 'not_found', message: 'Policy not found.' }, { status: 404 })
  }

  try {
    const policies = await policiesCollection()
    const policy = await policies.findOne(withUserFilter(session.user_id, { _id: policyObjectId }))
    if (!policy) {
      return NextResponse.json({ code: 'not_found', message: 'Policy not found.' }, { status: 404 })
    }
    if (policy.status !== 'ready') {
      return NextResponse.json({ code: 'not_ready', message: 'This policy is still processing.' }, { status: 409 })
    }

    const question = buildLetterDraftQuestion(parsed.data.claim_details)

    const answer = await askPolicy({
      user_id: session.user_id,
      policy_id: policyObjectId.toHexString(),
      message: question,
      recent_turns: [],
      similar_past_questions: [],
    })

    return NextResponse.json({ letter_text: answer.answer })
  } catch (error) {
    logError('playbook.letter_draft', error)
    return NextResponse.json(
      { code: 'upstream_unavailable', message: 'Could not draft the letter. Please try again.' },
      { status: 503 }
    )
  }
}
