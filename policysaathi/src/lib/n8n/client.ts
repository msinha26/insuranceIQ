const WEBHOOK_SECRET_HEADER = 'X-PolicySaathi-Secret'
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 500

export class N8nError extends Error {
  status: number
  body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'N8nError'
    this.status = status
    this.body = body
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calls an n8n webhook with the shared secret header. Retries only on a
 * network error or a 5xx response, at most MAX_RETRIES times with backoff —
 * never retries a 4xx (docs/specs/n8n-ingestion-workflow.md,
 * docs/specs/n8n-rag-workflow.md both require the shared-secret header;
 * a 4xx here means a real misconfiguration, not a transient failure).
 */
export async function callN8nWebhook<TResponse>(url: string, payload: unknown): Promise<TResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Missing N8N_WEBHOOK_SECRET environment variable')
  }

  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [WEBHOOK_SECRET_HEADER]: secret,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const rawBody = await response.text()
        if (rawBody.trim() === '') {
          // Some n8n "Respond to Webhook" node configurations (e.g. a bare
          // node with no body set) return 200/202 with an empty body. That
          // is still a successful call — don't fail parsing JSON that was
          // never sent. Callers that need specific fields treat them as
          // optional for exactly this reason.
          return {} as TResponse
        }
        try {
          return JSON.parse(rawBody) as TResponse
        } catch {
          throw new N8nError(
            `n8n webhook returned ${response.status} with a non-JSON body: ${rawBody.slice(0, 200)}`,
            response.status,
            rawBody
          )
        }
      }

      const body = await response.text()

      if (response.status >= 400 && response.status < 500) {
        // Never retry a 4xx — it's a real error, not a transient one.
        throw new N8nError(`n8n webhook rejected the request (${response.status})`, response.status, body)
      }

      lastError = new N8nError(`n8n webhook returned ${response.status}`, response.status, body)
    } catch (error) {
      if (error instanceof N8nError && error.status < 500) {
        throw error
      }
      lastError = error
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }
  throw new Error('n8n webhook call failed for an unknown reason')
}
