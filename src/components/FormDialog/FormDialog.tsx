'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useActionState, useEffect, type ReactNode } from 'react'
import { IDLE_FORM_STATE, type FormState } from '@/core'
import { common } from '@/locales/cs/common'
import styles from './FormDialog.module.css'

interface FormDialogProps {
  title: string
  intro?: string
  action: (state: FormState, formData: FormData) => Promise<FormState>
  submitLabel: string
  onClose: () => void
  testId: string
  /** Rendered at the start of the action row, e.g. a secondary form action. */
  extraActions?: ReactNode
  children: ReactNode
}

/** Dialog around one server-action form; closes itself once the action succeeds. Mount it only while open. */
export const FormDialog = ({ title, intro, action, submitLabel, onClose, testId, extraActions, children }: FormDialogProps) => {
  const [state, formAction, pending] = useActionState(action, IDLE_FORM_STATE)

  useEffect(() => {
    if (state._type === 'done') onClose()
  }, [state, onClose])

  return (
    <Dialog open onClose={onClose} data-testid={testId}>
      <form action={formAction}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent className={styles.content}>
          {intro && <DialogContentText>{intro}</DialogContentText>}
          {children}
          {state._type === 'failed' && (
            <Alert severity="error" data-testid={`${testId}--failure`}>
              {state.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {extraActions}
          <span className={styles.spacer} />
          <Button onClick={onClose} color="inherit">
            {common.cancel}
          </Button>
          <Button type="submit" variant="contained" disabled={pending} data-testid={`${testId}--submit`}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
