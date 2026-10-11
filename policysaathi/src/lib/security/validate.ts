import { z } from 'zod'

export const phoneSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, 'Enter a valid Indian phone number.')

export const otpSendSchema = z.object({
  phone: phoneSchema,
})

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
})

// ---------------------------------------------------------------------------
// Upload (docs/specs/upload-api.md)
// ---------------------------------------------------------------------------
export const policyTypeSchema = z.enum(['individual', 'family_floater', 'group', 'top_up'])

export const ACCEPTED_FILE_MIME_TYPES = ['application/pdf'] as const

// PDF-only, and small enough that the whole file can travel as a base64
// field inside the n8n ingestion webhook's JSON body — no file URL for n8n
// to fetch back from the app, so no network path from n8n to this server
// is required. Base64 inflates size by ~33%, so 5MB stays comfortably
// under typical webhook body-size limits.
export const MAX_UPLOAD_FILE_SIZE_MB = Number(process.env.MAX_UPLOAD_FILE_SIZE_MB ?? '5')
export const MAX_POLICY_PAGE_COUNT = Number(process.env.MAX_POLICY_PAGE_COUNT ?? '60')
export const MAX_DOCUMENTS_PER_POLICY = Number(process.env.MAX_DOCUMENTS_PER_POLICY ?? '3')

export function mimeTypeToFileType(mimeType: string): 'pdf' | null {
  return mimeType === 'application/pdf' ? 'pdf' : null
}

// ---------------------------------------------------------------------------
// Snapshot correction (PRD Flow 3 step 6)
// ---------------------------------------------------------------------------
export const snapshotCorrectionSchema = z.object({
  term: z.string().min(1),
  corrected_value: z.string().trim().min(1).max(500),
})

// ---------------------------------------------------------------------------
// Chat (docs/specs/policy-chat-api.md)
// ---------------------------------------------------------------------------
export const createChatSessionSchema = z.object({
  policy_id: z.string().min(1),
})

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
})

export const answerFeedbackSchema = z.object({
  rating: z.enum(['up', 'down']),
})

// ---------------------------------------------------------------------------
// Letter draft (docs/specs/grievance-letter-draft.md)
// ---------------------------------------------------------------------------
export const letterDraftSchema = z.object({
  policy_id: z.string().min(1),
  claim_details: z.object({
    claim_number: z.string().max(200).optional(),
    hospital_name: z.string().min(1).max(200),
    admission_date: z.string().min(1).max(50),
    amount_claimed: z.string().min(1).max(50),
    reason_for_grievance: z.string().min(1).max(2000),
    contested_clause: z
      .object({
        text: z.string().min(1).max(2000),
        page: z.number().int().positive(),
      })
      .optional(),
  }),
})
