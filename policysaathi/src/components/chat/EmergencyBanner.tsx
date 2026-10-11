import { Phone } from 'lucide-react'

interface EmergencyBannerProps {
  onDismiss: () => void
}

// Exact copy from docs/specs/n8n-rag-workflow.md's Emergency Pre-Check —
// draft copy per the PRD, confirm final wording with the product owner.
// Design per docs/design.md §6.12: the only solid red element in the
// product; replaces the normal chat input until explicitly dismissed
// (docs/specs/safety-layer.md) — it does not auto-resume.
export function EmergencyBanner({ onDismiss }: EmergencyBannerProps) {
  return (
    <div className="emergency-banner" role="alert">
      <p>
        If this is a medical emergency, please call 112 or go to the nearest hospital immediately.
      </p>
      <p>
        I&apos;m pausing our conversation here — once the immediate situation is handled, I&apos;m glad to help you
        understand your policy or next steps.
      </p>
      <a href="tel:112" className="emergency-call-btn">
        <Phone size={20} aria-hidden="true" />
        Call 112
      </a>
      <button type="button" className="emergency-dismiss-btn" onClick={onDismiss}>
        I&apos;m safe, continue
      </button>
    </div>
  )
}
