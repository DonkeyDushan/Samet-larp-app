'use client'

/** The „Kdo jsi?" field — the only identity in the app (§3.1), written into the audit. */
import TextField from '@mui/material/TextField'
import { useCallback, type ChangeEvent } from 'react'
import { common } from '@/locales/cs/common'

interface AuthorFieldProps {
  value: string
  onChange: (value: string) => void
  name: string
  maxLength: number
  hint?: string
  testId: string
}

export const AuthorField = ({ value, onChange, name, maxLength, hint, testId }: AuthorFieldProps) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    [onChange],
  )

  return (
    <TextField
      name={name}
      value={value}
      onChange={handleChange}
      label={common.authorLabel}
      placeholder={common.authorPlaceholder}
      helperText={hint}
      required
      fullWidth
      autoComplete="nickname"
      slotProps={{ htmlInput: { maxLength, 'data-testid': testId } }}
    />
  )
}
