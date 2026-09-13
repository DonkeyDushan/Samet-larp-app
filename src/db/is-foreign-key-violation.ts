import { hasSqlState } from './sql-state'

/**
 * Postgres SQLSTATEs for a row still referenced through a foreign key:
 * `on delete restrict` raises 23001, `no action` raises 23503.
 */
const FOREIGN_KEY_VIOLATIONS: ReadonlySet<unknown> = new Set(['23001', '23503'])

export const isForeignKeyViolation = (error: unknown): boolean => hasSqlState(error, FOREIGN_KEY_VIOLATIONS)
