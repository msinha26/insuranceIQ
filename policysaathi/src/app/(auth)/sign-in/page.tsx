'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneInput } from '@/components/shared/PhoneInput'
import { OtpInput } from '@/components/shared/OtpInput'
import en from '@/lib/i18n/en.json'

const RESEND_COOLDOWN_SECONDS = 30
const OTP_LENGTH = 6
const PHONE_LENGTH = 10

type Step = 'phone' | 'otp'
type ErrorCode = keyof typeof en.signIn.errors

function errorMessageFor(code: string | null): string | undefined {
  if (!code) return undefined
  return en.signIn.errors[code as ErrorCode] ?? en.signIn.errors.internal_error
}

export default function SignInPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [otp, setOtp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const fullPhone = `+91${phoneDigits}`

  const sendCode = useCallback(async () => {
    setIsSubmitting(true)
    setErrorCode(null)
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrorCode(data.code ?? 'delivery_failed')
        return
      }
      setStep('otp')
      setOtp('')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch {
      setErrorCode('delivery_failed')
    } finally {
      setIsSubmitting(false)
    }
  }, [fullPhone])

  async function handlePhoneSubmit(event: FormEvent) {
    event.preventDefault()
    if (phoneDigits.length !== PHONE_LENGTH) {
      setErrorCode('invalid_phone')
      return
    }
    await sendCode()
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault()
    if (otp.length !== OTP_LENGTH) {
      setErrorCode('invalid_code')
      return
    }
    setIsSubmitting(true)
    setErrorCode(null)
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code: otp }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrorCode(data.code ?? 'invalid_code')
        return
      }
      router.push(data.is_new_user ? '/consent' : '/upload')
    } catch {
      setErrorCode('internal_error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const errorMessage = errorMessageFor(errorCode)

  return (
    <main className="page">
      <h1 className="headline">{en.signIn.title}</h1>

      <div className="form-card">
        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="form-stack">
            <PhoneInput
              value={phoneDigits}
              onChange={setPhoneDigits}
              label={en.signIn.phoneLabel}
              placeholder={en.signIn.phonePlaceholder}
              error={errorMessage}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || phoneDigits.length !== PHONE_LENGTH}
            >
              {isSubmitting ? en.signIn.sending : en.signIn.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="form-stack">
            <span className="field-label">{en.signIn.otpLabel}</span>
            <OtpInput value={otp} onChange={setOtp} error={errorMessage} disabled={isSubmitting} />
            <button type="submit" className="btn-primary" disabled={isSubmitting || otp.length !== OTP_LENGTH}>
              {isSubmitting ? en.signIn.verifying : en.signIn.verify}
            </button>
            <button type="button" className="btn-text" disabled={cooldown > 0 || isSubmitting} onClick={sendCode}>
              {cooldown > 0 ? en.signIn.resendIn.replace('{seconds}', String(cooldown)) : en.signIn.resend}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
