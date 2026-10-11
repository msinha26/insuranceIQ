import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { consentSchema, CURRENT_CONSENT_VERSION } from '@/lib/security/validate'
import { getSession } from '@/lib/auth/session'
import { consentsCollection, usersCollection } from '@/lib/mongodb/collections'
import { logError } from '@/lib/security/sanitize-log'

// The frontend fetches the current version to render the right consent
// text — it never sends its own version string as a trusted value for
// anything other than matching (docs/specs/consent-capture.md).
export async function GET() {
  return NextResponse.json({ version: CURRENT_CONSENT_VERSION })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 'unauthorized', message: 'Please sign in again.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'invalid_request', message: 'Request body must be JSON.' }, { status: 400 })
  }

  const parsed = consentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ code: 'invalid_request', message: 'A consent version is required.' }, { status: 400 })
  }

  if (!parsed.data.age_confirmed) {
    return NextResponse.json(
      { code: 'age_required', message: 'You must confirm you are 18 or older.' },
      { status: 400 }
    )
  }

  if (parsed.data.version !== CURRENT_CONSENT_VERSION) {
    return NextResponse.json(
      { code: 'version_mismatch', message: 'This consent text has been updated. Please reload and try again.' },
      { status: 400 }
    )
  }

  const userId = new ObjectId(session.user_id)

  try {
    const consents = await consentsCollection()

    // Re-accepting the same version is a no-op, not an error
    // (docs/specs/consent-capture.md).
    const alreadyAccepted = await consents.findOne({ user_id: userId, version: CURRENT_CONSENT_VERSION })
    if (alreadyAccepted) {
      return NextResponse.json({
        accepted: true,
        version: CURRENT_CONSENT_VERSION,
        accepted_at: alreadyAccepted.accepted_at,
      })
    }

    const acceptedAt = new Date()
    await consents.insertOne({
      _id: new ObjectId(),
      user_id: userId,
      version: CURRENT_CONSENT_VERSION,
      accepted_at: acceptedAt,
    })

    const users = await usersCollection()
    await users.updateOne({ _id: userId }, { $set: { age_confirmed_18_plus: true } })

    return NextResponse.json({ accepted: true, version: CURRENT_CONSENT_VERSION, accepted_at: acceptedAt })
  } catch (error) {
    logError('consent.accept', error)
    return NextResponse.json({ code: 'internal_error', message: 'Could not record consent. Try again.' }, { status: 500 })
  }
}
