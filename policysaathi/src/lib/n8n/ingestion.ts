import { callN8nWebhook } from './client'

export interface TriggerIngestionPayload {
  user_id: string
  policy_id: string
  document_id: string
  file_base64: string
  file_type: 'pdf'
}

export interface TriggerIngestionResponse {
  accepted: true
  document_id: string
}

/**
 * Calls n8n Flow 1 (document_ingestion) — docs/specs/n8n-ingestion-workflow.md.
 * The file travels as a base64 field in the JSON body, not a URL — n8n never
 * needs to call back into this app to fetch it, so this works the same in
 * local dev and in production. n8n responds 202 immediately and does the
 * real work (OCR, classification, Snapshot extraction, chunking, embedding)
 * asynchronously, writing the final result directly into MongoDB — there is
 * no callback to wait for.
 */
export async function triggerIngestion(payload: TriggerIngestionPayload): Promise<TriggerIngestionResponse> {
  const url = process.env.N8N_INGESTION_WEBHOOK_URL
  if (!url) {
    throw new Error('Missing N8N_INGESTION_WEBHOOK_URL environment variable')
  }
  return callN8nWebhook<TriggerIngestionResponse>(url, payload)
}
