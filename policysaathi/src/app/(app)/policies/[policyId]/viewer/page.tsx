'use client'

import { useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

// Page-level jump only. Exact-sentence pixel highlighting (bounding_box
// overlay on a custom-rendered page) is the full Document Viewer feature's
// scope — this gives working, honest navigation now rather than a broken
// link, without claiming the overlay this doesn't yet render.
export default function DocumentViewerPage() {
  const params = useParams<{ policyId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const documentId = searchParams.get('doc')
  const initialPage = Number(searchParams.get('page') ?? '1')
  const [currentPage, setCurrentPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1)
  const [loadError, setLoadError] = useState(false)

  if (!documentId) {
    return (
      <main className="viewer-page">
        <p className="body-text">No document specified.</p>
      </main>
    )
  }

  const fileUrl = `/api/policies/${params.policyId}/documents/${documentId}/file`

  return (
    <main className="viewer-page">
      <div className="viewer-toolbar">
        <button type="button" className="viewer-icon-btn" onClick={() => router.back()} aria-label="Close">
          <X size={24} aria-hidden="true" />
        </button>
        <div className="viewer-page-controls">
          <button
            type="button"
            className="viewer-icon-btn"
            onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <span className="viewer-page-label">Page {currentPage}</span>
          <button
            type="button"
            className="viewer-icon-btn"
            onClick={() => setCurrentPage((value) => value + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="viewer-content">
        {loadError ? (
          <p className="field-error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>This document is no longer available.</span>
          </p>
        ) : (
          <iframe key={currentPage} src={`${fileUrl}#page=${currentPage}`} title="Policy document" className="viewer-iframe" />
        )}
      </div>
    </main>
  )
}
