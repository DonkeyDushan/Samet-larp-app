import Button from '@mui/material/Button'
import Link from 'next/link'
import { StatusMessage } from '@/components'
import { HOME_ROUTE } from '@/core'
import { navigation } from '@/locales/cs/navigation'

const NotFoundPage = () => (
  <StatusMessage
    severity="info"
    title={navigation.notFoundTitle}
    body={navigation.notFoundBody}
    action={
      <Button component={Link} href={HOME_ROUTE} color="inherit" data-testid="not-found--home">
        {navigation.backToRuns}
      </Button>
    }
    testId="not-found"
  />
)

export default NotFoundPage
