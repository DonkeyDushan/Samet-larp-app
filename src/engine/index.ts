/**
 * Rules engine (§7) — a pure function, no database, network or React.
 *
 * Only the types exist so far; `evaluate` itself comes later (§15.1).
 */
export * from './types'

/** Recorded with every computation (`computations.engine_version`). */
export const ENGINE_VERSION = '0.0.0-schema'
