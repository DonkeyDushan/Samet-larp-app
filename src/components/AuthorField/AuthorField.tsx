'use client'

/** The „Kdo jsi?" field — the only identity in the app (§3.1), written into the audit. */
import { useCallback, type ChangeEvent } from 'react'
import { common } from '@/locales/cs/common'

interface AuthorFieldProps {
  value: string
  onChange: (value: string) => void
  name?: string
  hint?: string
  className?: string
  testId: string
}

export const AuthorField = ({ value, onChange, name, hint, className, testId }: AuthorFieldProps) => {
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [onChange])

  return (
    <label className="block text-sm">
      <span className="font-medium">{common.authorLabel}</span>
      <input
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={common.authorPlaceholder}
        className={`mt-1 block w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800 ${className ?? ''}`}
        data-testid={testId}
      />
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </label>
  )
}
