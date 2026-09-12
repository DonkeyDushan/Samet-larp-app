import type { RunScope } from '@/db'
import { chapters } from '@/db/schema'
import type { IdMap } from './entity-ids'

/** Chapters are created with the run, so the import only looks them up. */
export const loadChapterIds = async (scope: RunScope): Promise<IdMap<number>> => {
  const rows = await scope.select(chapters)

  return new Map(rows.map((row) => [row.number, row.id]))
}
