'use client'

import { useId } from 'react'
import { AlertTriangle } from 'lucide-react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  error?: string
  disabled?: boolean
}

export function PhoneInput({ value, onChange, label, placeholder, error, disabled }: PhoneInputProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`

  return (
    <div className="field">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div className="phone-input-row">
        <span className="phone-input-prefix" aria-hidden="true">
          +91
        </span>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 10))}
          className={error ? 'phone-input-field phone-input-field-error' : 'phone-input-field'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}
