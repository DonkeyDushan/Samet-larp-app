import type { RunScope } from '@/db'
import { computations } from '@/db/schema'

/** After the first computation the config is frozen and an upload is an emergency fix (§6.5). */
export const isConfigFrozen = async (scope: RunScope): Promise<boolean> => {
  const rows = await scope.selectColumns(computations, { id: computations.id })

  return rows.length > 0
}
