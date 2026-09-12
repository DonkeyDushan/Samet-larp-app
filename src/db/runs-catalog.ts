/**
 * The list of runs, for the run switcher (§6.4).
 *
 * The one read that cannot be run-scoped — it is how a run gets chosen. It lives
 * here so application code never needs `unscopedDb` (architecture rule 2).
 */
import { unscopedDb } from './client'
import { runs } from './schema'

export interface RunSummary {
  id: string
  label: string | null
}

export const listRuns = async (): Promise<RunSummary[]> =>
  unscopedDb.select({ id: runs.id, label: runs.label }).from(runs).orderBy(runs.id)
