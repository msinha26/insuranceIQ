'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { SnapshotTermCard, type SnapshotTermData } from '@/components/snapshot/SnapshotTermCard'
import { SNAPSHOT_GROUPS } from '@/lib/snapshot-terms'
import { AppToolbar } from '@/components/shared/AppToolbar'

const TOTAL_TERMS = SNAPSHOT_GROUPS.reduce((count, group) => count + group.termKeys.length, 0)

function notFoundTerm(termKey: string): SnapshotTermData {
  return {
    term: termKey,
    value: null,
    document_id: null,
    page_number: null,
    line_number: null,
    confidence: null,
    source_sentence: null,
    is_not_found: true,
    low_quality_source: false,
  }
}

type LoadState = 'loading' | 'not_ready' | 'ready' | 'error'

// Snapshot term extraction runs as its own branch in n8n, independent of
// (and sometimes slower than) the chunking/embedding path that flips
// policies.status to "ready" — so the very first successful fetch can
// legitimately race ahead of extraction finishing and see zero terms.
// Keep polling for a bit rather than settling on an empty result immediately.
const EMPTY_RESULT_MAX_RETRIES = 8
const EMPTY_RESULT_POLL_MS = 3000

export default function SnapshotPage() {
  const params = useParams<{ policyId: string }>()
  const router = useRouter()
  const [terms, setTerms] = useState<SnapshotTermData[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [groupIndex, setGroupIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let emptyResultAttempts = 0

    async function load() {
      try {
        const response = await fetch(`/api/policies/${params.policyId}/snapshot`)
        if (cancelled) return

        if (response.status === 404) {
          const data = await response.json()
          if (data.code === 'not_ready') {
            setState('not_ready')
            timer = setTimeout(load, 3000)
            return
          }
          setState('error')
          return
        }

        if (!response.ok) {
          setState('error')
          return
        }

        const data: { terms: SnapshotTermData[] } = await response.json()

        if (data.terms.length === 0 && emptyResultAttempts < EMPTY_RESULT_MAX_RETRIES) {
          emptyResultAttempts += 1
          setState('not_ready')
          timer = setTimeout(load, EMPTY_RESULT_POLL_MS)
          return
        }

        setTerms(data.terms)
        setGroupIndex(0)
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    }

    load()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [params.policyId])

  function handleViewInDocument(documentId: string, pageNumber: number) {
    router.push(`/policies/${params.policyId}/viewer?doc=${documentId}&page=${pageNumber}`)
  }

  const termsByKey = new Map(terms.map((term) => [term.term, term]))

  return (
    <>
      <AppToolbar title="Your policy at a glance" />
      <main className="page page-scroll">
      <h1 className="headline">Your policy at a glance</h1>
      <p className="disclaimer">
        InsuranceIQ explains your policy documents. It is not your insurer, and this is not legal, medical or
        financial advice. Your insurer&apos;s decision on a claim may differ. Confirm before you act.
      </p>

      {state === 'loading' || state === 'not_ready' ? (
        <div className="snapshot-skeleton" aria-live="polite">
          <p className="body-text">Reading your policy… this can take up to 45 seconds.</p>
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      ) : state === 'error' ? (
        <p className="field-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Could not load your Snapshot. Please refresh the page.</span>
        </p>
      ) : (
        <div className="snapshot-results-card">
          <div>
            <h2 className="snapshot-results-title">Key terms</h2>
            <p className="snapshot-results-subtitle">{terms.length} of {TOTAL_TERMS} terms found.</p>
          </div>

          <section className="snapshot-group">
            <h3 className="snapshot-group-heading">{SNAPSHOT_GROUPS[groupIndex].heading}</h3>
            {SNAPSHOT_GROUPS[groupIndex].termKeys.map((termKey) => (
              <SnapshotTermCard
                key={termKey}
                data={termsByKey.get(termKey) ?? notFoundTerm(termKey)}
                policyId={params.policyId}
                onViewInDocument={handleViewInDocument}
              />
            ))}
          </section>

          {SNAPSHOT_GROUPS.length > 1 ? (
            <nav className="snapshot-pager" aria-label="Term groups">
              <button
                type="button"
                className="snapshot-pager-btn"
                onClick={() => setGroupIndex((value) => Math.max(0, value - 1))}
                disabled={groupIndex === 0}
                aria-label="Previous group"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <span className="snapshot-pager-label">
                {groupIndex + 1} of {SNAPSHOT_GROUPS.length}
              </span>
              <button
                type="button"
                className="snapshot-pager-btn"
                onClick={() => setGroupIndex((value) => Math.min(SNAPSHOT_GROUPS.length - 1, value + 1))}
                disabled={groupIndex === SNAPSHOT_GROUPS.length - 1}
                aria-label="Next group"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </div>
      )}

      {state === 'ready' ? (
        <div className="snapshot-actions">
          <a href={`/policies/${params.policyId}/chat`} className="btn-primary">
            Ask about my policy
          </a>
          <a href={`/policies/${params.policyId}/grievance`} className="btn-secondary">
            Claims &amp; Grievance Guide
          </a>
        </div>
      ) : null}
      </main>
    </>
  )
}
