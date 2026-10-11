'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { DropZone } from '@/components/upload/DropZone'
import { DocumentStatusList, type DocumentStatusItem } from '@/components/upload/DocumentStatusList'

const POLICY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'family_floater', label: 'Family floater' },
  { value: 'group', label: 'Group' },
  { value: 'top_up', label: 'Top-up' },
] as const

const STEPS = ['Upload', 'Review terms'] as const

const POLL_INTERVAL_MS = 3000

interface PolicyStatusResponse {
  policy: { id: string; status: 'processing' | 'ready' | 'failed' }
  documents: Array<{
    id: string
    doc_class: string | null
    unreadable_pages: number[]
    status: 'processing' | 'ready' | 'failed'
    error: string | null
  }>
}

export default function UploadPage() {
  const router = useRouter()
  const [policyType, setPolicyType] = useState<string>('individual')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [policyId, setPolicyId] = useState<string | null>(null)
  const [policyFailed, setPolicyFailed] = useState(false)
  const [items, setItems] = useState<DocumentStatusItem[]>([])
  const pollTimer = useRef<ReturnType<typeof setTimeout>>()
  const fileNamesRef = useRef<string[]>([])
  const fileSizesRef = useRef<number[]>([])

  const currentStep = policyId ? 2 : 1

  function handleFilesSelected(files: File[]) {
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 3))
    setErrorMessage(null)
  }

  const poll = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/policies/${id}`)
        if (!response.ok) {
          pollTimer.current = setTimeout(() => poll(id), POLL_INTERVAL_MS)
          return
        }
        const data: PolicyStatusResponse = await response.json()

        setItems(
          data.documents.map((doc, index) => ({
            id: doc.id,
            fileName: fileNamesRef.current[index] ?? `Document ${index + 1}`,
            fileSize: fileSizesRef.current[index],
            status: doc.status,
            docClass: doc.doc_class,
            unreadablePages: doc.unreadable_pages,
            error: doc.error,
          }))
        )

        if (data.policy.status === 'ready') {
          router.push(`/policies/${id}/snapshot`)
          return
        }

        if (data.policy.status === 'failed') {
          // Stop polling — this would otherwise loop forever, since
          // "failed" never becomes "ready" on its own.
          setPolicyFailed(true)
          return
        }

        pollTimer.current = setTimeout(() => poll(id), POLL_INTERVAL_MS)
      } catch {
        pollTimer.current = setTimeout(() => poll(id), POLL_INTERVAL_MS)
      }
    },
    [router]
  )

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current)
    },
    []
  )

  async function handleSubmit() {
    if (selectedFiles.length === 0) {
      setErrorMessage('Choose at least one file.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    fileNamesRef.current = selectedFiles.map((file) => file.name)
    fileSizesRef.current = selectedFiles.map((file) => file.size)

    const formData = new FormData()
    formData.set('policy_type', policyType)
    selectedFiles.forEach((file) => formData.append('files', file))

    try {
      const response = await fetch('/api/policies', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.message ?? 'Could not upload your policy. Try again.')
        return
      }

      setPolicyId(data.policy_id)
      setItems(
        (data.documents as Array<{ document_id: string }>).map((doc, index) => ({
          id: doc.document_id,
          fileName: fileNamesRef.current[index] ?? `Document ${index + 1}`,
          fileSize: fileSizesRef.current[index],
          status: 'processing' as const,
        }))
      )
      pollTimer.current = setTimeout(() => poll(data.policy_id), POLL_INTERVAL_MS)
    } catch {
      setErrorMessage('Could not upload your policy. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page page-scroll upload-page">
      <div className="upload-header">
        <h1 className="headline">Upload your policy</h1>
        <p className="body-text upload-subtitle">
          Choose your policy type, upload the PDF, and we&apos;ll pull out the key terms.
        </p>
      </div>

      <ol className="step-indicator">
        {STEPS.map((label, index) => {
          const step = index + 1
          const state = step < currentStep ? 'done' : step === currentStep ? 'active' : 'upcoming'
          return (
            <li key={label} className={`step-indicator-item step-indicator-${state}`}>
              <span className="step-indicator-number">{step}</span>
              {label}
            </li>
          )
        })}
      </ol>

      <div className="form-card">
        {!policyId ? (
          <>
            <div className="field">
              <label htmlFor="policy-type" className="field-label">
                Policy type
              </label>
              <select
                id="policy-type"
                className="select-field"
                value={policyType}
                onChange={(event) => setPolicyType(event.target.value)}
                disabled={isSubmitting}
              >
                {POLICY_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <DropZone onFilesSelected={handleFilesSelected} disabled={isSubmitting} />

            {selectedFiles.length > 0 ? (
              <ul className="selected-files-list">
                {selectedFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`}>{file.name}</li>
                ))}
              </ul>
            ) : null}

            {errorMessage ? (
              <p className="field-error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>{errorMessage}</span>
              </p>
            ) : null}

            <button
              type="button"
              className="btn-primary"
              disabled={isSubmitting || selectedFiles.length === 0}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Uploading…' : 'Upload policy'}
            </button>
          </>
        ) : policyFailed ? (
          <>
            <p className="field-error" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>We couldn&apos;t process this policy. You can try uploading it again.</span>
            </p>
            <DocumentStatusList items={items} />
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setPolicyId(null)
                setPolicyFailed(false)
                setItems([])
                setSelectedFiles([])
              }}
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <p className="body-text">We&apos;re processing your policy. This can take up to 45 seconds.</p>
            <DocumentStatusList items={items} />
          </>
        )}
      </div>
    </main>
  )
}
