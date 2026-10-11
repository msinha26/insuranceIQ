import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { policiesCollection, documentsCollection } from '@/lib/mongodb/collections'
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

    const documents = await documentsCollection()
    const policyDocuments = await documents.find({ policy_id: policy._id }).toArray()

    return NextResponse.json({
      policy: {
        id: policy._id.toHexString(),
        policy_type: policy.policy_type,
        status: policy.status,
        created_at: policy.created_at,
      },
      documents: policyDocuments.map((doc) => ({
        id: doc._id.toHexString(),
        file_type: doc.file_type,
        doc_class: doc.doc_class,
        ocr_quality: doc.ocr_quality,
        unreadable_pages: doc.unreadable_pages,
        status: doc.status,
        error: doc.error,
      })),
    })
  } catch (error) {
    logError('policies.get', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not load this policy.' }, { status: 500 })
  }
}
