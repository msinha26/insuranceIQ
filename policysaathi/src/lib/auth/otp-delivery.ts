// Delivers an already-generated OTP code over SMS (MSG91 primary, Twilio
// fallback) or WhatsApp (MSG91). The code itself is always generated and
// verified by this app (docs/specs/auth-otp.md) — these functions only ever
// transmit a code they're given, so the same code is valid no matter which
// channel actually delivered it.

const MSG91_SMS_URL = 'https://api.msg91.com/api/v5/flow/'
const MSG91_WHATSAPP_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/'

function smsProvidersConfigured(): boolean {
  const msg91Configured = Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_FLOW_ID)
  const twilioConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
  )
  return msg91Configured || twilioConfigured
}

/**
 * True only when neither SMS provider is configured and this isn't a
 * production environment — the single condition gating every dev-only OTP
 * shortcut (fixed code, console-logged delivery). Both `otp.ts` and this
 * file check the same function, so they can never disagree, and the
 * bypass stops applying the moment real credentials are added above —
 * nothing to remember to revert.
 */
export function isOtpDevBypassActive(): boolean {
  return process.env.NODE_ENV !== 'production' && !smsProvidersConfigured()
}

function twilioMessagesUrl(accountSid: string): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
}

async function sendViaMsg91(phone: string, code: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY
  const flowId = process.env.MSG91_OTP_FLOW_ID
  if (!authKey || !flowId) {
    throw new Error('MSG91 is not configured (MSG91_AUTH_KEY / MSG91_OTP_FLOW_ID)')
  }

  const response = await fetch(MSG91_SMS_URL, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      flow_id: flowId,
      mobiles: phone.replace('+', ''),
      OTP: code,
    }),
  })

  if (!response.ok) {
    throw new Error(`MSG91 responded with status ${response.status}`)
  }
}

async function sendViaTwilio(phone: string, code: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)')
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const body = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: `Your PolicySaathi code is ${code}. It expires in 5 minutes.`,
  })

  const response = await fetch(twilioMessagesUrl(accountSid), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Twilio responded with status ${response.status}`)
  }
}

/**
 * Primary (MSG91) with automatic fallback (Twilio) on delivery failure —
 * docs/specs/auth-otp.md's provider chain. Throws only if both fail.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (!smsProvidersConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No SMS provider is configured')
    }
    // TEMPORARY DEV BYPASS — see isOtpDevBypassActive() above.
    console.warn(`[DEV ONLY — no SMS provider configured] OTP code for ${phone}: ${code}`)
    return
  }

  try {
    await sendViaMsg91(phone, code)
  } catch (primaryError) {
    try {
      await sendViaTwilio(phone, code)
    } catch (fallbackError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : 'unknown error'
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'unknown error'
      throw new Error(`Both SMS providers failed: primary=${primaryMessage}, fallback=${fallbackMessage}`)
    }
  }
}

/**
 * WhatsApp OTP fallback — an explicit user choice, not the primary MVP
 * flow (docs/specs/auth-otp.md). Requires an approved WhatsApp Business
 * template carrying one text variable for the code.
 */
export async function sendOtpWhatsapp(phone: string, code: string): Promise<void> {
  const authKey = process.env.MSG91_WHATSAPP_API_KEY
  const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_NAME
  const namespace = process.env.MSG91_WHATSAPP_NAMESPACE
  const integratedNumber = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER
  if (!authKey || !templateName || !namespace || !integratedNumber) {
    throw new Error(
      'MSG91 WhatsApp is not configured (MSG91_WHATSAPP_API_KEY / MSG91_WHATSAPP_TEMPLATE_NAME / MSG91_WHATSAPP_NAMESPACE / MSG91_WHATSAPP_INTEGRATED_NUMBER)'
    )
  }

  const recipient = phone.replace('+', '')
  const response = await fetch(MSG91_WHATSAPP_URL, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      integrated_number: integratedNumber,
      content_type: 'template',
      payload: {
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en', policy: 'deterministic' },
          namespace,
          to_and_components: [
            {
              to: [recipient],
              components: {
                body_1: { type: 'text', value: code },
              },
            },
          ],
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`MSG91 WhatsApp responded with status ${response.status}`)
  }
}
