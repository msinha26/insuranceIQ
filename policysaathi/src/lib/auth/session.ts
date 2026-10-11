import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const SESSION_COOKIE_NAME = 'policysaathi_session'
export const SESSION_DURATION_DAYS = Number(process.env.SESSION_JWT_EXPIRY_DAYS ?? '30')

export interface SessionPayload {
  user_id: string
  phone: string
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_JWT_SECRET
  if (!secret) {
    throw new Error('Missing SESSION_JWT_SECRET environment variable')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ user_id: payload.user_id, phone: payload.phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey())
}

/**
 * Verifies a session JWT. Safe to call from Edge middleware — jose's
 * HS256 verification only needs Web Crypto, not the Node.js runtime.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (typeof payload.user_id !== 'string' || typeof payload.phone !== 'string') {
      return null
    }
    return { user_id: payload.user_id, phone: payload.phone }
  } catch {
    return null
  }
}

/**
 * Reads the current session from the request's cookies. Only valid inside a
 * Server Component, Route Handler, or Server Action — not inside
 * middleware (use verifySessionToken directly there instead).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return null
  }
  return verifySessionToken(token)
}
