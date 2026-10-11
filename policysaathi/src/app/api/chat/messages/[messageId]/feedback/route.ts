import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { answerFeedbackSchema } from '@/lib/security/validate'
import { chatMessagesCollection, chatSessionsCollection, answerFeedbackCollection } from '@/lib/mongodb/collections'
import { withUserFilter } from '@/lib/security/tenant-filter'
import { logError } from '@/lib/security/sanitize-log'

interface RouteParams {
  params: { messageId: string }
}

/**
 * Records a thumbs up/down on one assistant message. Ownership is checked
 * by walking message -> session -> session.user_id, since chat_messages has
 * no user_id of its own (docs/specs/mongodb-schema.md).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  let messageObjectId: ObjectId
  try {
    messageObjectId = new ObjectId(params.messageId)
  } catch {
    return NextResponse.json({ code: 'not_found', message: 'Message not found.' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'invalid_request', message: 'Request body must be JSON.' }, { status: 400 })
  }

  const parsed = answerFeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'invalid_request', message: 'Rating must be up or down.' }, { status: 400 })
  }

  try {
    const chatMessages = await chatMessagesCollection()
    const message = await chatMessages.findOne({ _id: messageObjectId, role: 'assistant' })
    if (!message) {
      return NextResponse.json({ code: 'not_found', message: 'Message not found.' }, { status: 404 })
    }

    const chatSessions = await chatSessionsCollection()
    const owned = await chatSessions.findOne(withUserFilter(session.user_id, { _id: message.session_id }))
    if (!owned) {
      return NextResponse.json({ code: 'not_found', message: 'Message not found.' }, { status: 404 })
    }

    const now = new Date()
    const feedback = await answerFeedbackCollection()
    await feedback.updateOne(
      { message_id: messageObjectId },
      {
        $set: { rating: parsed.data.rating, user_id: new ObjectId(session.user_id), updated_at: now },
        $setOnInsert: { _id: new ObjectId(), message_id: messageObjectId, created_at: now },
      },
      { upsert: true }
    )

    return NextResponse.json({ rating: parsed.data.rating })
  } catch (error) {
    logError('chat.messages.feedback', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not save your feedback.' }, { status: 500 })
  }
}
