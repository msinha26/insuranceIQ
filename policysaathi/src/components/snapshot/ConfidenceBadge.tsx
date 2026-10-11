import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'

interface ConfidenceBadgeProps {
  confidence: number
}

// Thresholds and copy match docs/design.md §6.3 exactly.
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence >= 0.8) {
    return (
      <span className="confidence-pill confidence-pill-high">
        <CheckCircle2 size={16} aria-hidden="true" />
        High
      </span>
    )
  }

  if (confidence >= 0.5) {
    return (
      <span className="confidence-pill confidence-pill-medium">
        <AlertCircle size={16} aria-hidden="true" />
        Check this
      </span>
    )
  }

  return (
    <span className="confidence-pill confidence-pill-low">
      <AlertTriangle size={16} aria-hidden="true" />
      Low
    </span>
  )
}
