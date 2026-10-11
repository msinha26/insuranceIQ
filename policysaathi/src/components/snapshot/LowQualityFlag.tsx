import { AlertTriangle } from 'lucide-react'

interface LowQualityFlagProps {
  pageNumber: number | null
}

/**
 * Shown whenever a term's source page scored low on OCR quality —
 * independent of the extraction model's own confidence (FR-05 guardrail,
 * docs/specs/ocr-quality-scoring.md).
 */
export function LowQualityFlag({ pageNumber }: LowQualityFlagProps) {
  return (
    <p className="low-quality-flag">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>
        This page was hard to read clearly{pageNumber ? ` (page ${pageNumber})` : ''}. Please check it in the
        document.
      </span>
    </p>
  )
}
