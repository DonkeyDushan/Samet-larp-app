const errorCode = (value: unknown): unknown =>
  typeof value === 'object' && value !== null && 'code' in value ? value.code : undefined

/** Drizzle wraps driver errors, so the Postgres SQLSTATE may sit on `cause`. */
export const hasSqlState = (error: unknown, states: ReadonlySet<unknown>): boolean => {
  if (states.has(errorCode(error))) return true

  const cause = typeof error === 'object' && error !== null && 'cause' in error ? error.cause : undefined

  return states.has(errorCode(cause))
}
