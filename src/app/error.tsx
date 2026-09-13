'use client'

import Button from '@mui/material/Button'
import { StatusMessage } from '@/components'
import { common } from '@/locales/cs/common'
import { navigation } from '@/locales/cs/navigation'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

const ErrorPage = ({ reset }: ErrorPageProps) => (
  <StatusMessage
    severity="error"
    title={navigation.errorTitle}
    body={navigation.errorBody}
    action={
      <Button color="inherit" onClick={reset} data-testid="error-page--retry">
        {common.retry}
      </Button>
    }
    testId="error-page"
  />
)

export default ErrorPage
