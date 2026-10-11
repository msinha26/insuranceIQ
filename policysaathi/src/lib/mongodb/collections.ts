import { type Collection, ObjectId } from 'mongodb'
import { getDb } from './client'

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export interface UserDoc {
  _id: ObjectId
  phone: string
  age_confirmed_18_plus: boolean
  created_at: Date
}

let usersIndexesEnsured = false

export async function usersCollection(): Promise<Collection<UserDoc>> {
  const db = await getDb()
  const collection = db.collection<UserDoc>('users')
  if (!usersIndexesEnsured) {
    await collection.createIndex({ phone: 1 }, { unique: true })
    usersIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// otp_codes
// ---------------------------------------------------------------------------
export interface OtpCodeDoc {
  _id: ObjectId
  phone: string
  code_hash: string
  expires_at: Date
}

let otpCodesIndexesEnsured = false

export async function otpCodesCollection(): Promise<Collection<OtpCodeDoc>> {
  const db = await getDb()
  const collection = db.collection<OtpCodeDoc>('otp_codes')
  if (!otpCodesIndexesEnsured) {
    await collection.createIndex({ phone: 1 })
    await collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
    otpCodesIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// consents
// ---------------------------------------------------------------------------
export interface ConsentDoc {
  _id: ObjectId
  user_id: ObjectId
  version: string
  accepted_at: Date
}

let consentsIndexesEnsured = false

export async function consentsCollection(): Promise<Collection<ConsentDoc>> {
  const db = await getDb()
  const collection = db.collection<ConsentDoc>('consents')
  if (!consentsIndexesEnsured) {
    await collection.createIndex({ user_id: 1, version: 1 })
    consentsIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// policies
// ---------------------------------------------------------------------------
export type PolicyType = 'individual' | 'family_floater' | 'group' | 'top_up'
export type ProcessingStatus = 'processing' | 'ready' | 'failed'

export interface PolicyDoc {
  _id: ObjectId
  // Hex-string copy of _id. n8n's MongoDB node matches update filters by
  // exact BSON type — a string filter never matches an ObjectId _id — so
  // this lets n8n's status-write-back nodes match by plain string equality
  // instead of needing to construct a real ObjectId.
  id: string
  user_id: ObjectId
  policy_type: PolicyType
  status: ProcessingStatus
  created_at: Date
  updated_at: Date
}

let policiesIndexesEnsured = false

export async function policiesCollection(): Promise<Collection<PolicyDoc>> {
  const db = await getDb()
  const collection = db.collection<PolicyDoc>('policies')
  if (!policiesIndexesEnsured) {
    await collection.createIndex({ user_id: 1 })
    await collection.createIndex({ id: 1 }, { unique: true })
    policiesIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// documents
// ---------------------------------------------------------------------------
export type DocumentFileType = 'pdf'
export type DocClass = 'schedule' | 'wording' | 'group_certificate' | 'endorsement' | 'other'
export type OcrQualityLabel = 'high' | 'low' | 'unreadable'

export interface OcrQualityFlag {
  page: number
  quality_score: number
  label: OcrQualityLabel
}

export interface DocumentDoc {
  _id: ObjectId
  // Hex-string copy of _id — see PolicyDoc.id's comment.
  id: string
  policy_id: ObjectId
  gridfs_file_id: ObjectId
  file_type: DocumentFileType
  doc_class: DocClass | null
  ocr_quality: OcrQualityFlag[]
  unreadable_pages: number[]
  status: ProcessingStatus
  error: string | null
  created_at: Date
  updated_at: Date
}

let documentsIndexesEnsured = false

export async function documentsCollection(): Promise<Collection<DocumentDoc>> {
  const db = await getDb()
  const collection = db.collection<DocumentDoc>('documents')
  if (!documentsIndexesEnsured) {
    await collection.createIndex({ policy_id: 1 })
    await collection.createIndex({ id: 1 }, { unique: true })
    documentsIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// snapshot_terms
// ---------------------------------------------------------------------------
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface SnapshotTermDoc {
  _id: ObjectId
  policy_id: ObjectId
  // Which of the policy's up-to-3 documents this term came from — page
  // numbers are only unique within a single document, not across a policy,
  // so the viewer needs this to open the right file.
  document_id: ObjectId | null
  term: string
  value: string | null
  page_number: number | null
  line_number: number | null
  bounding_box: BoundingBox | null
  confidence: number | null
  source_sentence: string | null
  is_not_found: boolean
  low_quality_source: boolean
}

let snapshotTermsIndexesEnsured = false

export async function snapshotTermsCollection(): Promise<Collection<SnapshotTermDoc>> {
  const db = await getDb()
  const collection = db.collection<SnapshotTermDoc>('snapshot_terms')
  if (!snapshotTermsIndexesEnsured) {
    await collection.createIndex({ policy_id: 1 })
    snapshotTermsIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// snapshot_corrections (addition — PRD Flow 3 step 6 / Snapshot correction
// rate metric; flagged as missing in docs/prd-techspecs-review-feedback.md)
// ---------------------------------------------------------------------------
export interface SnapshotCorrectionDoc {
  _id: ObjectId
  policy_id: ObjectId
  user_id: ObjectId
  term: string
  original_value: string | null
  corrected_value: string
  created_at: Date
}

let snapshotCorrectionsIndexesEnsured = false

export async function snapshotCorrectionsCollection(): Promise<Collection<SnapshotCorrectionDoc>> {
  const db = await getDb()
  const collection = db.collection<SnapshotCorrectionDoc>('snapshot_corrections')
  if (!snapshotCorrectionsIndexesEnsured) {
    await collection.createIndex({ policy_id: 1 })
    snapshotCorrectionsIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// chat_sessions
// ---------------------------------------------------------------------------
export interface ChatSessionDoc {
  _id: ObjectId
  policy_id: ObjectId
  user_id: ObjectId
  created_at: Date
}

let chatSessionsIndexesEnsured = false

export async function chatSessionsCollection(): Promise<Collection<ChatSessionDoc>> {
  const db = await getDb()
  const collection = db.collection<ChatSessionDoc>('chat_sessions')
  if (!chatSessionsIndexesEnsured) {
    await collection.createIndex({ user_id: 1, policy_id: 1 })
    chatSessionsIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// chat_messages
// ---------------------------------------------------------------------------
export type ChatRole = 'user' | 'assistant'
export type ChatRoute = 'insurance_policy' | 'claims_guide' | 'both' | 'general'
export type ChunkType = 'text' | 'table'

export interface Citation {
  // Which of the policy's documents this citation's page belongs to — page
  // numbers are only unique within a single document.
  document_id: string | null
  page: number
  line_number: number | null
  bounding_box: BoundingBox | null
  chunk_type: ChunkType | null
}

export interface ChatMessageDoc {
  _id: ObjectId
  session_id: ObjectId
  role: ChatRole
  content: string
  route: ChatRoute | null
  citations: Citation[]
  safety_flag: string | null
  created_at: Date
}

let chatMessagesIndexesEnsured = false

export async function chatMessagesCollection(): Promise<Collection<ChatMessageDoc>> {
  const db = await getDb()
  const collection = db.collection<ChatMessageDoc>('chat_messages')
  if (!chatMessagesIndexesEnsured) {
    await collection.createIndex({ session_id: 1 })
    // Powers findSimilarQuestionPatterns' cross-user lookup (src/lib/mongodb/feedback-insights.ts).
    await collection.createIndex({ content: 'text' })
    chatMessagesIndexesEnsured = true
  }
  return collection
}

// ---------------------------------------------------------------------------
// answer_feedback
// ---------------------------------------------------------------------------
export type FeedbackRating = 'up' | 'down'

export interface AnswerFeedbackDoc {
  _id: ObjectId
  message_id: ObjectId
  user_id: ObjectId
  rating: FeedbackRating
  created_at: Date
  updated_at: Date
}

let answerFeedbackIndexesEnsured = false

export async function answerFeedbackCollection(): Promise<Collection<AnswerFeedbackDoc>> {
  const db = await getDb()
  const collection = db.collection<AnswerFeedbackDoc>('answer_feedback')
  if (!answerFeedbackIndexesEnsured) {
    // One rating per message — re-rating updates it rather than adding a row.
    await collection.createIndex({ message_id: 1 }, { unique: true })
    answerFeedbackIndexesEnsured = true
  }
  return collection
}
