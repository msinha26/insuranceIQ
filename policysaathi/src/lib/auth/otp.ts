import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { otpCodesCollection } from '@/lib/mongodb/collections'
import { isOtpDevBypassActive } from './otp-delivery'

const OTP_CODE_LENGTH = 6
const OTP_TTL_SECONDS = Number(process.env.OTP_CODE_TTL_SECONDS ?? '300')
const OTP_HASH_ROUNDS = 10
const DEV_BYPASS_FIXED_CODE = '123456'

export type OtpVerifyResult = 'ok' | 'expired' | 'invalid'

function generateOtpCode(): string {
  if (isOtpDevBypassActive()) {
    // TEMPORARY DEV BYPASS, requested for local testing: every phone
    // number gets this same fixed code instead of a random one, so there's
    // nothing to look up in the server log. Gated by the exact same
    // condition as otp-delivery.ts's console-logging bypass — see
    // isOtpDevBypassActive()'s doc comment for why that's safe.
    return DEV_BYPASS_FIXED_CODE
  }
  return randomInt(0, 10 ** OTP_CODE_LENGTH)
    .toString()
    .padStart(OTP_CODE_LENGTH, '0')
}

/**
 * Generates a code, hashes it, and upserts it as the phone's one pending
 * code — any prior pending code for this phone is overwritten
 * (docs/specs/auth-otp.md step 3). Returns the plain code so the caller can
 * dispatch it; only the hash is ever persisted.
 */
export async function issueOtpCode(phone: string): Promise<string> {
  const code = generateOtpCode()
  const codeHash = await bcrypt.hash(code, OTP_HASH_ROUNDS)
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000)

  const collection = await otpCodesCollection()
  await collection.updateOne(
    { phone },
    { $set: { phone, code_hash: codeHash, expires_at: expiresAt } },
    { upsert: true }
  )

  return code
}

/**
 * Verifies a submitted code against the phone's pending code. The
 * expires_at check is explicit here, not inferred from the TTL index —
 * MongoDB's background TTL sweep is not instantaneous, so a code past its
 * expiry may still physically exist for a short window.
 */
export async function verifyOtpCode(phone: string, submittedCode: string): Promise<OtpVerifyResult> {
  const collection = await otpCodesCollection()
  const pending = await collection.findOne({ phone })

  if (!pending) {
    return 'expired'
  }

  if (pending.expires_at.getTime() < Date.now()) {
    await collection.deleteOne({ _id: pending._id })
    return 'expired'
  }

  const matches = await bcrypt.compare(submittedCode, pending.code_hash)
  if (!matches) {
    return 'invalid'
  }

  // One-time use: delete on successful verification.
  await collection.deleteOne({ _id: pending._id })
  return 'ok'
}
