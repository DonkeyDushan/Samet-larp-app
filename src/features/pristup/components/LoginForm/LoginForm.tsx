'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useActionState, useState } from 'react'
import { AuthorField } from '@/components'
import { ACCESS_FIELDS, AUTHOR_MAX_LENGTH, IDLE_FORM_STATE } from '@/core'
import { access } from '@/locales/cs/access'
import { errors } from '@/locales/cs/errors'
import { logIn } from '../../actions/log-in'
import styles from './LoginForm.module.css'

interface LoginFormProps {
  returnPath: string
  /** Prefilled from the browser, so the same org only types the password. */
  defaultAuthor: string
  isPasswordConfigured: boolean
}

export const LoginForm = ({ returnPath, defaultAuthor, isPasswordConfigured }: LoginFormProps) => {
  const [author, setAuthor] = useState(defaultAuthor)
  const [state, formAction, pending] = useActionState(logIn, IDLE_FORM_STATE)

  return (
    <Paper variant="outlined" component="section" className={styles.panel} data-testid="login">
      <Typography variant="h5" component="h1">
        {access.title}
      </Typography>
      <Typography variant="body2" className={styles.intro}>
        {access.intro}
      </Typography>

      {!isPasswordConfigured && (
        <Alert severity="error" data-testid="login--not-configured">
          {errors.passwordNotConfigured}
        </Alert>
      )}

      <form action={formAction} className={styles.form}>
        <input type="hidden" name={ACCESS_FIELDS.returnPath} value={returnPath} />

        <TextField
          type="password"
          name={ACCESS_FIELDS.password}
          label={access.passwordLabel}
          autoComplete="current-password"
          autoFocus
          required
          fullWidth
          slotProps={{ htmlInput: { 'data-testid': 'login--password' } }}
        />

        <AuthorField
          name={ACCESS_FIELDS.author}
          value={author}
          onChange={setAuthor}
          maxLength={AUTHOR_MAX_LENGTH}
          hint={access.authorHint}
          testId="login--author"
        />

        {state._type === 'failed' && (
          <Alert severity="error" data-testid="login--failure">
            {state.message}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={pending || !isPasswordConfigured}
          className={styles.submit}
          data-testid="login--submit"
        >
          {pending ? access.submitting : access.submit}
        </Button>
      </form>
    </Paper>
  )
}
