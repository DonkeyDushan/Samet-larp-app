import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import type { ReactNode } from 'react'
import styles from './StatusMessage.module.css'

interface StatusMessageProps {
  severity: 'error' | 'info'
  title: string
  body: string
  action: ReactNode
  testId: string
}

/** Full-screen message for a missing page or a failed load. */
export const StatusMessage = ({ severity, title, body, action, testId }: StatusMessageProps) => (
  <main className={styles.main}>
    <Alert severity={severity} action={action} className={styles.alert} data-testid={testId}>
      <AlertTitle>{title}</AlertTitle>
      {body}
    </Alert>
  </main>
)
