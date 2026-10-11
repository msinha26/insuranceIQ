import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { documentsCollection, policiesCollection } from '@/lib/mongodb/collections'
import { withUserFilter } from '@/lib/security/tenant-filter'
import { openGridFsDownloadStream } from '@/lib/gridfs/stream'
import { logError } from '@/lib/security/sanitize-log'

interface RouteParams {
  params: { id: string; docId: string }
}

/**
 * Streams a GridFS file to the document viewer after verifying a session
 * owning the policy (docs/specs/upload-api.md). n8n never calls this route —
 * ingestion receives the file's bytes directly in the webhook body instead.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  let policyObjectId: ObjectId
  let documentObjectId: ObjectId
  try {
    policyObjectId = new ObjectId(params.id)
    documentObjectId = new ObjectId(params.docId)
  } catch {
    return NextResponse.json({ code: 'not_found', message: 'Document not found.' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  let authorized = false
  try {
    const policies = await policiesCollection()
    const owned = await policies.findOne(withUserFilter(session.user_id, { _id: policyObjectId }))
    authorized = Boolean(owned)
  } catch (error) {
    logError('policies.file.ownership_check', error)
  }

  if (!authorized) {
    return NextResponse.json({ code: 'unauthorized', message: 'Not authorized to access this file.' }, { status: 401 })
  }

  try {
    const documents = await documentsCollection()
    const document = await documents.findOne({ _id: documentObjectId, policy_id: policyObjectId })

    if (!document) {
      return NextResponse.json({ code: 'not_found', message: 'Document not found.' }, { status: 404 })
    }

    const file = await openGridFsDownloadStream(document.gridfs_file_id)
    if (!file) {
      return NextResponse.json({ code: 'not_found', message: 'This document is no longer available.' }, { status: 404 })
    }

    return new Response(file.stream, {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Length': String(file.length),
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    logError('policies.file.stream', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not load this file.' }, { status: 500 })
  }
}
