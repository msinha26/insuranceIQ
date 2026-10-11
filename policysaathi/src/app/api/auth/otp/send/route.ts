import { NextRequest, NextResponse } from 'next/server'
import { otpSendSchema } from '@/lib/security/validate'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { issueOtpCode } from '@/lib/auth/otp'
import { sendOtpSms } from '@/lib/auth/otp-delivery'
import { logError } from '@/lib/security/sanitize-log'

const MAX_SENDS_PER_WINDOW = 3
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'invalid_phone', message: 'Request body must be JSON.' }, { status: 400 })
  }

  const parsed = otpSendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'invalid_phone', message: 'Enter a valid Indian phone number.' }, { status: 400 })
  }

  const { phone } = parsed.data

  const withinLimit = await checkRateLimit(`otp_send:${phone}`, MAX_SENDS_PER_WINDOW, RATE_LIMIT_WINDOW_SECONDS)
  if (!withinLimit) {
    return NextResponse.json(
      { code: 'rate_limited', message: 'Please wait before requesting another code.' },
      { status: 429 }
    )
  }

  try {
    const code = await issueOtpCode(phone)
    await sendOtpSms(phone, code)
  } catch (error) {
    logError('otp.send', error)
    return NextResponse.json(
      { code: 'delivery_failed', message: 'Could not send the code. Please try again.' },
      { status: 503 }
    )
  }

  return NextResponse.json({ sent: true })
}
