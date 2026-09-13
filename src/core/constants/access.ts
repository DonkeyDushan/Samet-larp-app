/** Proof that the shared password was entered (§3.1). */
export const ACCESS_COOKIE = 'larp_pristup'

/** The „Kdo jsi?" name (§3.1), attached to every audit record. */
export const AUTHOR_COOKIE = 'larp_kdo'

/** Long enough that nobody is asked for the password in the middle of a game weekend. */
export const AUTH_COOKIE_MAX_AGE_DAYS = 60

export const SECONDS_PER_DAY = 86_400

/** Longer names are almost certainly a paste accident; the audit wants a short handle. */
export const AUTHOR_MAX_LENGTH = 60

/** Message signed by the password to derive the cookie value; changing it logs everyone out. */
export const ACCESS_TOKEN_PURPOSE = 'samet-larp-pristup-v1'

/** Slows down guessing the shared password on the public internet. */
export const LOGIN_FAILURE_DELAY_MS = 1_000

/** Form field names shared by the login form and the actions reading them. */
export const ACCESS_FIELDS = Object.freeze({
  password: 'password',
  author: 'author',
  returnPath: 'returnPath',
} as const)
