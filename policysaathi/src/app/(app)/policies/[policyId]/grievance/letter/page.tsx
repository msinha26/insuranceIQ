'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default function LetterDraftPage() {
  const params = useParams<{ policyId: string }>()
  const [hospitalName, setHospitalName] = useState('')
  const [admissionDate, setAdmissionDate] = useState('')
  const [amountClaimed, setAmountClaimed] = useState('')
  const [claimNumber, setClaimNumber] = useState('')
  const [reason, setReason] = useState('')
  const [contestedClauseText, setContestedClauseText] = useState('')
  const [contestedClausePage, setContestedClausePage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [letterText, setLetterText] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit() {
    if (!hospitalName.trim() || !admissionDate.trim() || !amountClaimed.trim() || !reason.trim()) {
      setErrorMessage('Please fill in the required fields.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/playbook/letter-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: params.policyId,
          claim_details: {
            hospital_name: hospitalName.trim(),
            admission_date: admissionDate.trim(),
            amount_claimed: amountClaimed.trim(),
            claim_number: claimNumber.trim() || undefined,
            reason_for_grievance: reason.trim(),
            contested_clause:
              contestedClauseText.trim() && contestedClausePage.trim()
                ? { text: contestedClauseText.trim(), page: Number(contestedClausePage) }
                : undefined,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrorMessage(data.message ?? 'Could not draft the letter. Try again.')
        return
      }
      setLetterText(data.letter_text)
    } catch {
      setErrorMessage('Could not draft the letter. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCopy() {
    if (!letterText) return
    await navigator.clipboard.writeText(letterText)
  }

  function handleDownload() {
    if (!letterText) return
    const blob = new Blob([letterText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'grievance-letter.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (letterText !== null) {
    return (
      <main className="page page-scroll">
        <h1 className="headline">Your draft letter</h1>
        <p className="body-text">
          Review this draft carefully. You send it yourself — InsuranceIQ never sends anything on your behalf.
        </p>
        <textarea
          className="letter-draft-editor"
          value={letterText}
          onChange={(event) => setLetterText(event.target.value)}
          rows={18}
        />
        <div className="letter-draft-actions">
          <button type="button" className="btn-secondary" onClick={handleCopy}>
            Copy
          </button>
          <button type="button" className="btn-secondary" onClick={handleDownload}>
            Download
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page page-scroll">
      <h1 className="headline">Draft a grievance letter</h1>

      <div className="form-stack">
        <div className="field">
          <label htmlFor="hospital" className="field-label">
            Hospital name
          </label>
          <input
            id="hospital"
            type="text"
            className="text-field"
            value={hospitalName}
            onChange={(event) => setHospitalName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="admission-date" className="field-label">
            Admission date
          </label>
          <input
            id="admission-date"
            type="date"
            className="text-field"
            value={admissionDate}
            onChange={(event) => setAdmissionDate(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="amount" className="field-label">
            Amount claimed
          </label>
          <input
            id="amount"
            type="text"
            className="text-field"
            value={amountClaimed}
            onChange={(event) => setAmountClaimed(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="claim-number" className="field-label">
            Claim number (if you have one)
          </label>
          <input
            id="claim-number"
            type="text"
            className="text-field"
            value={claimNumber}
            onChange={(event) => setClaimNumber(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="reason" className="field-label">
            What happened
          </label>
          <textarea
            id="reason"
            className="text-field"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="clause-text" className="field-label">
            Clause you&apos;re contesting (optional)
          </label>
          <input
            id="clause-text"
            type="text"
            className="text-field"
            value={contestedClauseText}
            onChange={(event) => setContestedClauseText(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="clause-page" className="field-label">
            Page number of that clause (optional)
          </label>
          <input
            id="clause-page"
            type="number"
            className="text-field"
            value={contestedClausePage}
            onChange={(event) => setContestedClausePage(event.target.value)}
          />
        </div>

        {errorMessage ? (
          <p className="field-error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : null}

        <button type="button" className="btn-primary" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Drafting…' : 'Draft letter'}
        </button>
      </div>
    </main>
  )
}
