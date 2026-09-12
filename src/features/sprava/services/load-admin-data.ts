import { forRun, listRuns, type RunSummary } from '@/db'
import { configVersions } from '@/db/schema'
import { errorMessage } from '@/utils/error-message'
import type { VersionRow } from '../types/version-row'

export interface AdminData {
  runs: RunSummary[]
  runId?: string
  /** Newest first. */
  versions: VersionRow[]
  /** The database did not answer; checking a file still works without it. */
  failure?: string
}

const loadVersions = async (runId: string): Promise<VersionRow[]> => {
  const rows = await forRun(runId).select(configVersions)
  const versions: VersionRow[] = []
  for (const row of rows) {
    versions.push({
      id: row.id,
      version: row.version,
      isActive: row.isActive,
      sourceFilename: row.sourceFilename,
      note: row.note,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      importReport: row.importReport,
    })
  }

  return versions.sort((a, b) => b.version - a.version)
}

/** Defaults to the first run when none is selected. */
export const loadAdminData = async (requestedRunId: string | undefined): Promise<AdminData> => {
  let runs: RunSummary[] = []
  try {
    runs = await listRuns()
  } catch (cause) {
    return { runs, runId: requestedRunId, versions: [], failure: errorMessage(cause) }
  }

  const runId = requestedRunId ?? runs[0]?.id
  if (!runId) return { runs, versions: [] }

  try {
    return { runs, runId, versions: await loadVersions(runId) }
  } catch (cause) {
    return { runs, runId, versions: [], failure: errorMessage(cause) }
  }
}
