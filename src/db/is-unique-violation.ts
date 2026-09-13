import { hasSqlState } from './sql-state'

/** Postgres SQLSTATE `unique_violation`, including a primary key collision. */
const UNIQUE_VIOLATIONS: ReadonlySet<unknown> = new Set(['23505'])

export const isUniqueViolation = (error: unknown): boolean => hasSqlState(error, UNIQUE_VIOLATIONS)
