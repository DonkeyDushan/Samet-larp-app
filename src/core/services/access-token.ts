import { ACCESS_TOKEN_PURPOSE } from '../constants/access'

const encoder = new TextEncoder()

const HEX_RADIX = 16

const BYTE_HEX_DIGITS = 2

const toHex = (buffer: ArrayBuffer): string => {
  let hex = ''
  for (const byte of new Uint8Array(buffer)) hex += byte.toString(HEX_RADIX).padStart(BYTE_HEX_DIGITS, '0')

  return hex
}

/**
 * Cookie value derived from the password, so the password itself never sits in
 * the browser and changing `APP_PASSWORD` invalidates every issued cookie.
 * Web Crypto only: it runs in middleware as well as in server actions.
 */
export const accessToken = async (password: string): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])

  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(ACCESS_TOKEN_PURPOSE)))
}

/** Compares without an early exit, so response time does not leak the matching prefix. */
export const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false

  let difference = 0
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index)

  return difference === 0
}

export const isValidAccessToken = async (token: string | undefined, password: string | undefined): Promise<boolean> => {
  if (!token || !password) return false

  return constantTimeEqual(token, await accessToken(password))
}
