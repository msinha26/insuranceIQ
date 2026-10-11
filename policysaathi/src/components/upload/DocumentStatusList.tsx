import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react'

export interface DocumentStatusItem {
  id: string
  fileName: string
  fileSize?: number
  status: 'uploading' | 'processing' | 'ready' | 'failed'
  docClass?: string | null
  unreadablePages?: number[]
  error?: string | null
}

interface DocumentStatusListProps {
  items: DocumentStatusItem[]
}

const DOC_CLASS_LABELS: Record<string, string> = {
  schedule: 'Policy schedule',
  wording: 'Policy wording',
  group_certificate: 'Group certificate',
  endorsement: 'Endorsement',
  other: 'Other document',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round(bytes / 1024)} KB`
}

export function DocumentStatusList({ items }: DocumentStatusListProps) {
  return (
    <ul className="doc-status-list">
      {items.map((item) => {
        const inProgress = item.status === 'uploading' || item.status === 'processing'

        return (
          <li key={item.id} className="doc-status-row">
            <div className="doc-status-main">
              <FileText size={18} aria-hidden="true" className="doc-status-file-icon" />
              <span className="doc-status-name">
                {item.fileName}
                {item.fileSize ? <span className="doc-status-size"> ({formatFileSize(item.fileSize)})</span> : null}
              </span>
            </div>
            {item.docClass ? (
              <span className="doc-status-class">{DOC_CLASS_LABELS[item.docClass] ?? item.docClass}</span>
            ) : null}

            {inProgress ? (
              <div className="doc-status-progress">
                <div className="doc-status-progress-track">
                  <div className="doc-status-progress-fill" />
                </div>
                <span className="doc-status-progress-label">
                  {item.status === 'uploading' ? 'Uploading your policy…' : 'Reading your policy…'}
                </span>
              </div>
            ) : (
              <div className="doc-status-badge">
                {item.status === 'ready' ? (
                  <span className="doc-status-pill doc-status-pill-high">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Ready
                  </span>
                ) : (
                  <span className="doc-status-pill doc-status-pill-low">
                    <AlertTriangle size={16} aria-hidden="true" />
                    Failed
                  </span>
                )}
              </div>
            )}

            {item.unreadablePages && item.unreadablePages.length > 0 ? (
              <p className="doc-status-note">
                Could not read page{item.unreadablePages.length > 1 ? 's' : ''} {item.unreadablePages.join(', ')}.
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
