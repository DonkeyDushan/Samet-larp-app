/**
 * Shared password in front of the whole app (§3.1) — it runs on the public
 * internet. A name for the audit is required too, so no server action ever
 * writes an anonymous record.
 */
import { NextResponse, type NextRequest } from 'next/server'
// Direct paths keep React and locales out of the middleware bundle.
import { ACCESS_COOKIE, AUTHOR_COOKIE } from '@/core/constants/access'
import { LOGIN_ROUTE, RETURN_PATH_PARAM } from '@/core/constants/routes'
import { isValidAccessToken } from '@/core/services/access-token'
import { readAppPassword } from '@/core/services/app-password'

export const middleware = async (request: NextRequest) => {
  const { pathname, search } = request.nextUrl
  if (pathname === LOGIN_ROUTE) return NextResponse.next()

  const hasAccess = await isValidAccessToken(request.cookies.get(ACCESS_COOKIE)?.value, readAppPassword())
  if (hasAccess && request.cookies.get(AUTHOR_COOKIE)?.value) return NextResponse.next()

  const loginUrl = new URL(LOGIN_ROUTE, request.url)
  loginUrl.searchParams.set(RETURN_PATH_PARAM, `${pathname}${search}`)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
