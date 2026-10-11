import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { otpVerifySchema } from '@/lib/security/validate'
import { verifyOtpCode } from '@/lib/auth/otp'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_DAYS } from '@/lib/auth/session'
import { usersCollection } from '@/lib/mongodb/collections'
import { logError } from '@/lib/security/sanitize-log'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'invalid_code', message: 'Request body must be JSON.' }, { status: 400 })
  }

  const parsed = otpVerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'invalid_code', message: 'Enter the 6-digit code.' }, { status: 400 })
  }

  const { phone, code } = parsed.data

  let result: 'ok' | 'expired' | 'invalid'
  try {
    result = await verifyOtpCode(phone, code)
  } catch (error) {
    logError('otp.verify', error)
    return NextResponse.json({ code: 'invalid_code', message: 'Something went wrong. Try again.' }, { status: 500 })
  }

  if (result === 'expired') {
    return NextResponse.json(
      { code: 'code_expired', message: 'That code has expired. Request a new one.' },
      { status: 410 }
    )
  }
  if (result === 'invalid') {
    return NextResponse.json({ code: 'invalid_code', message: 'That code is incorrect.' }, { status: 401 })
  }

  let userId: string
  let isNewUser: boolean
  try {
    const users = await usersCollection()
    const existingUser = await users.findOne({ phone })

    if (existingUser) {
      userId = existingUser._id.toHexString()
      isNewUser = false
    } else {
      const insertResult = await users.insertOne({
        _id: new ObjectId(),
        phone,
        age_confirmed_18_plus: false,
        created_at: new Date(),
      })
      userId = insertResult.insertedId.toHexString()
      isNewUser = true
    }
  } catch (error) {
    logError('otp.verify.user', error)
    return NextResponse.json({ code: 'internal_error', message: 'Something went wrong. Try again.' }, { status: 500 })
  }

  const token = await createSessionToken({ user_id: userId, phone })

  const response = NextResponse.json({ session: true, is_new_user: isNewUser })
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  })
  return response
}
