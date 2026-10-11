'use client'

import { useState } from 'react'
import { ConfidenceBadge } from './ConfidenceBadge'
import { LowQualityFlag } from './LowQualityFlag'
import { labelForTerm } from '@/lib/snapshot-terms'

export interface SnapshotTermData {
  term: string
  value: string | null
  document_id: string | null
  page_number: number | null
  line_number: number | null
  confidence: number | null
  source_sentence: string | null
  is_not_found: boolean
  low_quality_source: boolean
}

interface SnapshotTermCardProps {
  data: SnapshotTermData
  policyId: string
  onViewInDocument: (documentId: string, pageNumber: number) => void
}

export function SnapshotTermCard({ data, policyId, onViewInDocument }: SnapshotTermCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [correctedValue, setCorrectedValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [correctionState, setCorrectionState] = useState<'idle' | 'sent' | 'error'>('idle')

  async function submitCorrection() {
    if (!correctedValue.trim()) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/policies/${policyId}/snapshot/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: data.term, corrected_value: correctedValue.trim() }),
      })
      setCorrectionState(response.ok ? 'sent' : 'error')
      if (response.ok) {
        setIsCorrecting(false)
      }
    } catch {
      setCorrectionState('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="snapshot-card">
      <button
        type="button"
        className="snapshot-card-toggle"
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
      >
        <span className="snapshot-card-term">{labelForTerm(data.term)}</span>

        {data.is_not_found ? (
          <span className="snapshot-card-not-found">Not found in your documents</span>
        ) : (
          <div className="snapshot-card-value-row">
            <span className="snapshot-card-value">{data.value}</span>
            {data.confidence !== null ? <ConfidenceBadge confidence={data.confidence} /> : null}
          </div>
        )}
      </button>

      {!data.is_not_found && data.page_number !== null && data.document_id ? (
        <button
          type="button"
          className="citation-chip"
          onClick={() => onViewInDocument(data.document_id as string, data.page_number as number)}
        >
          Page {data.page_number}
        </button>
      ) : null}

      {data.low_quality_source ? <LowQualityFlag pageNumber={data.page_number} /> : null}

      {isExpanded && !data.is_not_found ? (
        <div className="snapshot-card-expanded">
          {data.source_sentence ? (
            <blockquote className="clause-quote-block">{data.source_sentence}</blockquote>
          ) : null}

          {!isCorrecting ? (
            correctionState === 'sent' ? (
              <p className="body-text">Thanks — we&apos;ve noted your correction.</p>
            ) : (
              <button type="button" className="btn-text" onClick={() => setIsCorrecting(true)}>
                This looks wrong
              </button>
            )
          ) : (
            <div className="form-stack">
              <label htmlFor={`correct-${data.term}`} className="field-label">
                What should it say?
              </label>
              <input
                id={`correct-${data.term}`}
                type="text"
                className="text-field"
                value={correctedValue}
                onChange={(event) => setCorrectedValue(event.target.value)}
                disabled={isSubmitting}
              />
              <div className="snapshot-card-correction-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={isSubmitting || !correctedValue.trim()}
                  onClick={submitCorrection}
                >
                  Submit
                </button>
                <button type="button" className="btn-text" disabled={isSubmitting} onClick={() => setIsCorrecting(false)}>
                  Cancel
                </button>
              </div>
              {correctionState === 'error' ? (
                <p className="field-error" role="alert">
                  Could not record this. Try again.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
