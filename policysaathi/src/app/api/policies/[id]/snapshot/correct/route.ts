import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { snapshotCorrectionSchema } from '@/lib/security/validate'
import { policiesCollection, snapshotTermsCollection, snapshotCorrectionsCollection } from '@/lib/mongodb/collections'
import { withUserFilter } from '@/lib/security/tenant-filter'
import { logError } from '@/lib/security/sanitize-log'

/**
 * Records a user's correction to a Snapshot term — PRD Flow 3 step 6: "User
 * can flag a term as wrong and enter the right value; the original is kept
 * for the feedback loop." This never changes what snapshot_terms displays;
 * it only records the correction for the eval/feedback loop (the PRD's
 * "Snapshot correction rate" metric is computed from this collection).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  let policyObjectId: ObjectId
  try {
    policyObjectId = new ObjectId(params.id)
  } catch {
    return NextResponse.json({ code: 'not_found', message: 'Policy not found.' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'invalid_request', message: 'Request body must be JSON.' }, { status: 400 })
  }

  const parsed = snapshotCorrectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'invalid_request', message: 'A term and corrected value are required.' },
      { status: 400 }
    )
  }

  try {
    const policies = await policiesCollection()
    const policy = await policies.findOne(withUserFilter(session.user_id, { _id: policyObjectId }))
    if (!policy) {
      return NextResponse.json({ code: 'not_found', message: 'Policy not found.' }, { status: 404 })
    }

    const snapshotTerms = await snapshotTermsCollection()
    const existingTerm = await snapshotTerms.findOne({ policy_id: params.id, term: parsed.data.term })

    const corrections = await snapshotCorrectionsCollection()
    await corrections.insertOne({
      _id: new ObjectId(),
      policy_id: policyObjectId,
      user_id: new ObjectId(session.user_id),
      term: parsed.data.term,
      original_value: existingTerm?.value ?? null,
      corrected_value: parsed.data.corrected_value,
      created_at: new Date(),
    })

    return NextResponse.json({ recorded: true })
  } catch (error) {
    logError('policies.snapshot.correct', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not record this correction.' }, { status: 500 })
  }
}
