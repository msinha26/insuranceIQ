'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface AppToolbarProps {
  title: string
  onBack?: () => void
}

/**
 * Shared 56px app bar (docs/design.md §5) with a back button. Defaults to
 * router.back() — the page the user actually came from — unless the screen
 * needs different behaviour (e.g. sign-in's OTP step going back to the
 * phone step instead of leaving the flow).
 */
export function AppToolbar({ title, onBack }: AppToolbarProps) {
  const router = useRouter()

  return (
    <header className="app-toolbar">
      <button
        type="button"
        className="app-toolbar-back"
        onClick={onBack ?? (() => router.back())}
        aria-label="Back"
      >
        <ArrowLeft size={22} aria-hidden="true" />
      </button>
      <span className="app-toolbar-title">{title}</span>
    </header>
  )
}
