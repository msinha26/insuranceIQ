'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import en from '@/lib/i18n/en.json'
import { AppToolbar } from '@/components/shared/AppToolbar'

type ErrorCode = keyof typeof en.consent.errors

function errorMessageFor(code: string | null): string | undefined {
  if (!code) return undefined
  return en.consent.errors[code as ErrorCode] ?? en.consent.errors.internal_error
}

export default function ConsentPage() {
  const router = useRouter()
  const [version, setVersion] = useState<string | null>(null)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/consent')
      .then((response) => response.json())
      .then((data: { version: string }) => setVersion(data.version))
      .catch(() => setErrorCode('internal_error'))
  }, [])

  async function handleAccept() {
    if (!ageConfirmed) {
      setErrorCode('age_required')
      return
    }
    if (!version) {
      return
    }

    setIsSubmitting(true)
    setErrorCode(null)
    try {
      const response = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, age_confirmed: true }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrorCode(data.code ?? 'internal_error')
        return
      }
      router.push('/upload')
    } catch {
      setErrorCode('internal_error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const errorMessage = errorMessageFor(errorCode)

  return (
    <>
      <AppToolbar title={en.consent.title} />
      <main className="page">
        <h1 className="headline">{en.consent.title}</h1>
        <p className="body-text">{en.consent.body}</p>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(event) => setAgeConfirmed(event.target.checked)}
          />
          <span>{en.consent.ageConfirm}</span>
        </label>

        {errorMessage ? (
          <p className="field-error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : null}

        <button
          type="button"
          className="btn-primary"
          disabled={isSubmitting || !ageConfirmed || !version}
          onClick={handleAccept}
        >
          {isSubmitting ? en.consent.saving : en.consent.accept}
        </button>
      </main>
    </>
  )
}
