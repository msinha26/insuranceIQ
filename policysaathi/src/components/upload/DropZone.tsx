'use client'

import { useRef, type ChangeEvent } from 'react'
import { FileUp } from 'lucide-react'

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export function DropZone({ onFilesSelected, disabled }: DropZoneProps) {
  const pdfInputRef = useRef<HTMLInputElement>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
    event.target.value = ''
  }

  return (
    <div className="dropzone">
      <div className="dropzone-buttons">
        <button type="button" className="dropzone-btn" disabled={disabled} onClick={() => pdfInputRef.current?.click()}>
          <FileUp size={20} aria-hidden="true" />
          <span>Choose PDF</span>
        </button>
      </div>
      <p className="dropzone-helper">PDF only. Up to 5 MB and 60 pages.</p>
      <input ref={pdfInputRef} type="file" accept="application/pdf" multiple hidden onChange={handleChange} />
    </div>
  )
}
