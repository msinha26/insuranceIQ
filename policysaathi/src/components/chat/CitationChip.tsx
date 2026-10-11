'use client'

import { useRouter } from 'next/navigation'
import { FileSearch } from 'lucide-react'
import type { Citation } from '@/lib/mongodb/collections'

interface CitationChipProps {
  citation: Citation
  policyId: string
}

export function CitationChip({ citation, policyId }: CitationChipProps) {
  const router = useRouter()

  if (!citation.document_id) {
    // Per docs/specs/citation-verifier.md: a citation the verifier couldn't
    // resolve a document for is not navigable — show the could-not-verify
    // notice instead of a dead link (docs/design.md §6.5).
    return <span className="citation-chip citation-chip-unverified">Could not verify this against the page.</span>
  }

  return (
    <button
      type="button"
      className="citation-chip"
      onClick={() => router.push(`/policies/${policyId}/viewer?doc=${citation.document_id}&page=${citation.page}`)}
    >
      <FileSearch size={16} aria-hidden="true" />
      Page {citation.page}
    </button>
  )
}
