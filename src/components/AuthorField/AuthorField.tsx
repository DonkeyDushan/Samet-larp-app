'use client'

/** The „Kdo jsi?" field — the only identity in the app (§3.1), written into the audit. */
import TextField from '@mui/material/TextField'
import { useCallback, type ChangeEvent } from 'react'
import { common } from '@/locales/cs/common'
import styles from './AuthorField.module.css'

interface AuthorFieldProps {
  value: string
  onChange: (value: string) => void
  name?: string
  hint?: string
  narrow?: boolean
  testId: string
}

export const AuthorField = ({ value, onChange, name, hint, narrow = false, testId }: AuthorFieldProps) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    [onChange],
  )

  return (
    <TextField
      className={styles.field}
      data-narrow={narrow}
      name={name}
      value={value}
      onChange={handleChange}
      label={common.authorLabel}
      placeholder={common.authorPlaceholder}
      helperText={hint}
      fullWidth
      slotProps={{ htmlInput: { 'data-testid': testId } }}
    />
  )
}
