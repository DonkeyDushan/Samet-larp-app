'use server'

import { redirect } from 'next/navigation'
import { LOGIN_ROUTE } from '../constants/routes'
import { clearAccessToken } from '../services/auth-cookies'

export const logOut = async (): Promise<never> => {
  await clearAccessToken()
  redirect(LOGIN_ROUTE)
}
