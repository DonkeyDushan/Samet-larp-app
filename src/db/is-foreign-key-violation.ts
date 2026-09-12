/**
 * Postgres SQLSTATEs for a row still referenced through a foreign key:
 * `on delete restrict` raises 23001, `no action` raises 23503.
 */
const FOREIGN_KEY_VIOLATIONS: ReadonlySet<unknown> = new Set(['23001', '23503'])

const errorCode = (value: unknown): unknown =>
  typeof value === 'object' && value !== null && 'code' in value ? value.code : undefined

/** Drizzle wraps driver errors, so the code may sit on `cause`. */
export const isForeignKeyViolation = (error: unknown): boolean => {
  if (FOREIGN_KEY_VIOLATIONS.has(errorCode(error))) return true

  const cause = typeof error === 'object' && error !== null && 'cause' in error ? error.cause : undefined

  return FOREIGN_KEY_VIOLATIONS.has(errorCode(cause))
}
