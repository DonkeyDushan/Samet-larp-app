import { forRun, listRuns, type RunScope, type RunSummary } from '@/db'
import { uploadedFiles } from '@/db/schema'
import { isConfigFrozen } from '@/import'
import { errorMessage } from '@/utils/error-message'
import type { ArchiveRow } from '../types/archive-row'

export interface AdminData {
  runs: RunSummary[]
  runId?: string
  /** Newest first. */
  uploads: ArchiveRow[]
  /** The run has a computation, so an upload is an emergency fix (§6.5). */
  isConfigFrozen: boolean
  /** The database did not answer; checking a file still works without it. */
  failure?: string
}

/** Config first within one upload: its templates share the transaction's timestamp. */
const byNewest = (a: ArchiveRow, b: ArchiveRow): number =>
  b.createdAt.getTime() - a.createdAt.getTime() || Number(b.kind === 'konfigurace') - Number(a.kind === 'konfigurace')

const loadUploads = async (scope: RunScope): Promise<ArchiveRow[]> => {
  const rows = await scope.selectColumns(uploadedFiles, {
    id: uploadedFiles.id,
    kind: uploadedFiles.kind,
    filename: uploadedFiles.filename,
    note: uploadedFiles.note,
    reason: uploadedFiles.reason,
    createdAt: uploadedFiles.createdAt,
    createdBy: uploadedFiles.createdBy,
    importReport: uploadedFiles.importReport,
  })

  return rows.sort(byNewest)
}

/** Defaults to the first run when none is selected. */
export const loadAdminData = async (requestedRunId: string | undefined): Promise<AdminData> => {
  let runs: RunSummary[] = []
  try {
    runs = await listRuns()
  } catch (cause) {
    return { runs, runId: requestedRunId, uploads: [], isConfigFrozen: false, failure: errorMessage(cause) }
  }

  const runId = requestedRunId ?? runs[0]?.id
  if (!runId) return { runs, uploads: [], isConfigFrozen: false }

  try {
    const scope = forRun(runId)

    return { runs, runId, uploads: await loadUploads(scope), isConfigFrozen: await isConfigFrozen(scope) }
  } catch (cause) {
    return { runs, runId, uploads: [], isConfigFrozen: false, failure: errorMessage(cause) }
  }
}
