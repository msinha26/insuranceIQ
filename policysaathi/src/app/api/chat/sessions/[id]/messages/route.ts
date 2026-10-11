import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { chatMessageSchema } from '@/lib/security/validate'
import { chatSessionsCollection, chatMessagesCollection, policiesCollection } from '@/lib/mongodb/collections'
import { findSimilarQuestionPatterns } from '@/lib/mongodb/feedback-insights'
import { withUserFilter } from '@/lib/security/tenant-filter'
import { askPolicy, type RecentTurn } from '@/lib/n8n/retrieval'
import { logError } from '@/lib/security/sanitize-log'

const RECENT_TURNS_LIMIT = 20

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  let sessionObjectId: ObjectId
  try {
    sessionObjectId = new ObjectId(params.id)
  } catch {
    return NextResponse.json({ code: 'not_found', message: 'Conversation not found.' }, { status: 404 })
  }

  try {
    const chatSessions = await chatSessionsCollection()
    const chatSession = await chatSessions.findOne(withUserFilter(session.user_id, { _id: sessionObjectId }))
    if (!chatSession) {
      return NextResponse.json({ code: 'not_found', message: 'Conversation not found.' }, { status: 404 })
    }

    const chatMessages = await chatMessagesCollection()
    const messages = await chatMessages.find({ session_id: sessionObjectId }).sort({ created_at: 1 }).toArray()

    return NextResponse.json({
      messages: messages.map((message) => ({
        id: message._id.toHexString(),
        role: message.role,
        content: message.content,
        route: message.route,
        citations: message.citations,
        safety_flag: message.safety_flag,
        created_at: message.created_at,
      })),
    })
  } catch (error) {
    logError('chat.messages.list', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not load this conversation.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in.' }, { status: 401 })
  }

  let sessionObjectId: ObjectId
  try {
    sessionObjectId = new ObjectId(params.id)
  } catch {
    return NextResponse.json({ code: 'not_found', message: 'Conversation not found.' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'invalid_request', message: 'Request body must be JSON.' }, { status: 400 })
  }

  const parsed = chatMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'invalid_request', message: 'Enter a question.' }, { status: 400 })
  }

  const chatSessions = await chatSessionsCollection()
  const chatSession = await chatSessions.findOne(withUserFilter(session.user_id, { _id: sessionObjectId }))
  if (!chatSession) {
    return NextResponse.json({ code: 'not_found', message: 'Conversation not found.' }, { status: 404 })
  }

  // MongoDB has no FK to catch this automatically — re-check the policy
  // still exists before calling n8n or writing anything
  // (docs/specs/policy-chat-api.md).
  const policies = await policiesCollection()
  const policy = await policies.findOne({ _id: chatSession.policy_id })
  if (!policy) {
    return NextResponse.json({ code: 'not_found', message: 'This policy is no longer available.' }, { status: 404 })
  }

  const chatMessages = await chatMessagesCollection()

  try {
    await chatMessages.insertOne({
      _id: new ObjectId(),
      session_id: sessionObjectId,
      role: 'user',
      content: parsed.data.message,
      route: null,
      citations: [],
      safety_flag: null,
      created_at: new Date(),
    })

    const priorMessages = await chatMessages
      .find({ session_id: sessionObjectId })
      .sort({ created_at: -1 })
      .limit(RECENT_TURNS_LIMIT)
      .toArray()

    const recentTurns: RecentTurn[] = priorMessages
      .reverse()
      .map((message) => ({ role: message.role, content: message.content }))

    // Best-effort — a lookup failure should never block the chat turn itself.
    const similarPastQuestions = await findSimilarQuestionPatterns(parsed.data.message).catch((error) => {
      logError('chat.messages.similar_question_lookup', error)
      return []
    })

    const answer = await askPolicy({
      user_id: session.user_id,
      policy_id: chatSession.policy_id.toHexString(),
      message: parsed.data.message,
      recent_turns: recentTurns,
      similar_past_questions: similarPastQuestions,
    })

    const assistantMessageId = new ObjectId()
    await chatMessages.insertOne({
      _id: assistantMessageId,
      session_id: sessionObjectId,
      role: 'assistant',
      content: answer.answer,
      route: answer.route,
      citations: answer.citations,
      safety_flag: answer.safety_flag,
      created_at: new Date(),
    })

    return NextResponse.json({ ...answer, message_id: assistantMessageId.toHexString() })
  } catch (error) {
    logError('chat.messages.ask', error)
    return NextResponse.json(
      { code: 'upstream_unavailable', message: 'Chat is temporarily unavailable. Please try again.' },
      { status: 503 }
    )
  }
}
