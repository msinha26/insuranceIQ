import { FileText, BookOpen } from 'lucide-react'
import type { ChatRoute } from '@/lib/mongodb/collections'

interface SourceLabelProps {
  route: ChatRoute | null
}

// Styles match docs/design.md §6.4 exactly — the two tags must never look
// alike, and an answer using both sources shows two separate labelled
// blocks (handled by the caller rendering two SourceLabels), never merged.
export function SourceLabel({ route }: SourceLabelProps) {
  if (route === 'claims_guide') {
    return (
      <span className="source-tag source-tag-guidance">
        <BookOpen size={16} aria-hidden="true" />
        General guidance
      </span>
    )
  }

  if (route === 'insurance_policy' || route === 'both') {
    return (
      <span className="source-tag source-tag-policy">
        <FileText size={16} aria-hidden="true" />
        From your policy
      </span>
    )
  }

  return null
}
