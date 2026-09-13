import { cookies } from 'next/headers'
import { ACCESS_COOKIE, AUTH_COOKIE_MAX_AGE_DAYS, AUTHOR_COOKIE, SECONDS_PER_DAY } from '../constants/access'

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: AUTH_COOKIE_MAX_AGE_DAYS * SECONDS_PER_DAY,
})

/** The „Kdo jsi?" name; `''` when missing — the access check never lets that far. */
export const readAuthor = async (): Promise<string> => (await cookies()).get(AUTHOR_COOKIE)?.value ?? ''

export const writeAuthor = async (author: string): Promise<void> => {
  ;(await cookies()).set(AUTHOR_COOKIE, author, cookieOptions())
}

export const writeAccessToken = async (token: string): Promise<void> => {
  ;(await cookies()).set(ACCESS_COOKIE, token, cookieOptions())
}

/** The name stays: the same org logging back in should not retype it. */
export const clearAccessToken = async (): Promise<void> => {
  ;(await cookies()).delete(ACCESS_COOKIE)
}
