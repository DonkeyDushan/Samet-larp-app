/**
 * Public surface of the data layer.
 *
 * `unscopedDb` is deliberately absent: application code reaches data only
 * through `forRun(runId)` (architecture rule 2). Cross-run scripts (migration,
 * seed, backup) import it straight from `./client`, which shows up in the diff.
 */
export * as schema from './schema'
export { forRun, parseRunId, RunScope, type RunId, type RunScopedTable } from './run-scope'
export { createRun, findRun, listRuns, renameRun, type NewRun, type RunRename, type RunSummary } from './runs-catalog'
export { isForeignKeyViolation } from './is-foreign-key-violation'
export { isUniqueViolation } from './is-unique-violation'
