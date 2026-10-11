import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { createChatSessionSchema } from '@/lib/security/validate'
import { policiesCollection, chatSessionsCollection } from '@/lib/mongodb/collections'
import { withUserFilter } from '@/lib/security/tenant-filter'
import { logError } from '@/lib/security/sanitize-log'

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

  const parsed = createChatSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'invalid_request', message: 'A policy_id is required.' }, { status: 400 })
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

    const chatSessions = await chatSessionsCollection()
    const sessionDoc = {
      _id: new ObjectId(),
      policy_id: policyObjectId,
      user_id: new ObjectId(session.user_id),
      created_at: new Date(),
    }
    await chatSessions.insertOne(sessionDoc)

    return NextResponse.json({ session_id: sessionDoc._id.toHexString() })
  } catch (error) {
    logError('chat.sessions.create', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not start a chat session.' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  try {
    const chatSessions = await chatSessionsCollection()
    const sessions = await chatSessions
      .find(withUserFilter(session.user_id, {}))
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      sessions: sessions.map((item) => ({
        id: item._id.toHexString(),
        policy_id: item.policy_id.toHexString(),
        created_at: item.created_at,
      })),
    })
  } catch (error) {
    logError('chat.sessions.list', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not load your conversations.' }, { status: 500 })
  }
}
