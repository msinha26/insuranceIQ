import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { policiesCollection, snapshotTermsCollection } from '@/lib/mongodb/collections'
import { withUserFilter } from '@/lib/security/tenant-filter'
import { logError } from '@/lib/security/sanitize-log'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
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

  try {
    const policies = await policiesCollection()
    const policy = await policies.findOne(withUserFilter(session.user_id, { _id: policyObjectId }))

    if (!policy) {
      return NextResponse.json({ code: 'not_found', message: 'Policy not found.' }, { status: 404 })
    }

    if (policy.status !== 'ready') {
      return NextResponse.json(
        { code: 'not_ready', message: 'Your Snapshot is not ready yet.' },
        { status: 404 }
      )
    }

    const snapshotTerms = await snapshotTermsCollection()
    const terms = await snapshotTerms.find({ policy_id: policyObjectId }).toArray()

    return NextResponse.json({
      terms: terms.map((term) => ({
        term: term.term,
        value: term.value,
        document_id: term.document_id ? term.document_id.toHexString() : null,
        page_number: term.page_number,
        line_number: term.line_number,
        bounding_box: term.bounding_box,
        confidence: term.confidence,
        source_sentence: term.source_sentence,
        is_not_found: term.is_not_found,
        low_quality_source: term.low_quality_source,
      })),
    })
  } catch (error) {
    logError('policies.snapshot', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not load the Snapshot.' }, { status: 500 })
  }
}
