'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Send } from 'lucide-react'
import { MessageBubble, type ChatMessageData } from '@/components/chat/MessageBubble'
import { DisclaimerFooter } from '@/components/chat/DisclaimerFooter'
import { EmergencyBanner } from '@/components/chat/EmergencyBanner'

export default function ChatPage() {
  const params = useParams<{ policyId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [emergencyActive, setEmergencyActive] = useState(false)
  const [initError, setInitError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const autoSendHandled = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function startSession() {
      try {
        const response = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ policy_id: params.policyId }),
        })
        const data = await response.json()
        if (!response.ok) {
          if (!cancelled) setInitError(true)
          return
        }
        if (!cancelled) setSessionId(data.session_id)
      } catch {
        if (!cancelled) setInitError(true)
      }
    }

    startSession()
    return () => {
      cancelled = true
    }
  }, [params.policyId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const prefilledQuestion = searchParams.get('q')
    if (prefilledQuestion && sessionId && !autoSendHandled.current) {
      autoSendHandled.current = true
      sendMessage(prefilledQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, searchParams])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim() || !sessionId || isSending) return
    const question = draft.trim()
    setDraft('')
    await sendMessage(question)
  }

  async function sendMessage(question: string) {
    if (!sessionId || isSending) return

    setErrorMessage(null)
    setIsSending(true)

    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: question, route: null, citations: [], safety_flag: null },
    ])

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      })
      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.message ?? 'Chat is temporarily unavailable. Please try again.')
        return
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.message_id ?? `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          route: data.route,
          citations: data.citations ?? [],
          safety_flag: data.safety_flag,
        },
      ])

      if (data.safety_flag === 'emergency') {
        setEmergencyActive(true)
      }
    } catch {
      setErrorMessage('Chat is temporarily unavailable. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  if (initError) {
    return (
      <main className="page">
        <p className="field-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Could not start a conversation for this policy. Please go back and try again.</span>
        </p>
      </main>
    )
  }

  return (
    <main className="chat-page">
      <header className="chat-toolbar">
        <button type="button" className="chat-toolbar-back" onClick={() => router.back()} aria-label="Exit chat">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <span className="chat-toolbar-title">Chat</span>
      </header>

      <div className="chat-messages">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} policyId={params.policyId} />
        ))}
        {isSending ? (
          <div className="chat-typing-indicator" aria-live="polite">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {errorMessage ? (
          <p className="field-error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <DisclaimerFooter />

      {emergencyActive ? (
        <EmergencyBanner onDismiss={() => setEmergencyActive(false)} />
      ) : (
        <form onSubmit={handleSubmit} className="chat-composer">
          <textarea
            className="chat-composer-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about your policy…"
            rows={1}
            disabled={!sessionId || isSending}
          />
          <button
            type="submit"
            className="chat-composer-send"
            disabled={!sessionId || isSending || !draft.trim()}
            aria-label="Send"
          >
            <Send size={20} aria-hidden="true" />
          </button>
        </form>
      )}
    </main>
  )
}
