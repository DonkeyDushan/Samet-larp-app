import type { Route } from 'next'
import { HOME_ROUTE } from '../constants/routes'

/** Only same-site paths: `//host` and `/\host` would make the login an open redirect. */
export const safeReturnPath = (value: string | null | undefined): Route => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return HOME_ROUTE

  // Whatever path the middleware bounced here from; typedRoutes cannot know it.
  return value as Route
}
