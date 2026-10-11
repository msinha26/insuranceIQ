'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { SourceLabel } from './SourceLabel'
import { CitationChip } from './CitationChip'
import type { ChatRoute, Citation } from '@/lib/mongodb/collections'

export interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  route: ChatRoute | null
  citations: Citation[]
  safety_flag: string | null
}

interface MessageBubbleProps {
  message: ChatMessageData
  policyId: string
}

type FeedbackState = 'up' | 'down' | null

export function MessageBubble({ message, policyId }: MessageBubbleProps) {
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [feedbackError, setFeedbackError] = useState(false)

  if (message.role === 'user') {
    return (
      <div className="chat-bubble chat-bubble-user">
        <p>{message.content}</p>
      </div>
    )
  }

  async function rate(rating: 'up' | 'down') {
    const previous = feedback
    setFeedback(rating)
    setFeedbackError(false)
    try {
      const response = await fetch(`/api/chat/messages/${message.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
      if (!response.ok) throw new Error('feedback request failed')
    } catch {
      setFeedback(previous)
      setFeedbackError(true)
    }
  }

  const isUnverified = message.citations.length > 0 && message.citations.every((citation) => !citation.document_id)

  return (
    <div className="chat-bubble chat-bubble-assistant">
      <SourceLabel route={message.route} />
      <p className="chat-bubble-text">{message.content}</p>
      {message.citations.length > 0 && !isUnverified ? (
        <div className="citation-chip-row">
          {message.citations.map((citation, index) => (
            <CitationChip key={index} citation={citation} policyId={policyId} />
          ))}
        </div>
      ) : null}
      <div className="feedback-row">
        <button
          type="button"
          className={`feedback-btn${feedback === 'up' ? ' feedback-btn-active' : ''}`}
          onClick={() => rate('up')}
          aria-pressed={feedback === 'up'}
          aria-label="Helpful answer"
        >
          <ThumbsUp size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`feedback-btn${feedback === 'down' ? ' feedback-btn-active' : ''}`}
          onClick={() => rate('down')}
          aria-pressed={feedback === 'down'}
          aria-label="Not helpful"
        >
          <ThumbsDown size={16} aria-hidden="true" />
        </button>
        {feedbackError ? <span className="feedback-error">Could not save. Try again.</span> : null}
      </div>
    </div>
  )
}
