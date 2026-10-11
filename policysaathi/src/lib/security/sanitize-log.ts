/**
 * Logs an error with context only — never the raw error object, which may
 * carry request payloads (phone numbers, OTP codes, chat messages, policy
 * text). Engineering guardrail: no user content logged in plain text
 * anywhere (docs/engineering/engineering-doc.md §11).
 */
export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`[${context}] ${message}`)
}
