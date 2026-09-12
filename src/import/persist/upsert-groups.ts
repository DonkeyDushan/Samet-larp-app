import type { RunScope } from '@/db'
import { groups } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'

/** Prefix of group IDs derived from free-text group names. */
const GROUP_ID_PREFIX = 'G_'

/** Group names are free text in the sheet; the stored ID is derived from them. */
const externalGroupId = (name: string): string =>
  `${GROUP_ID_PREFIX}${name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')}`

/** Returns group name → database ID. */
export const upsertGroups = async (scope: RunScope, config: ParsedConfig, versionId: string): Promise<IdMap> => {
  for (const group of config.groups) {
    await scope
      .insert(groups, {
        externalId: externalGroupId(group.name),
        name: group.name,
        sourceConfigVersionId: versionId,
      })
      .onConflictDoUpdate({
        target: [groups.runId, groups.externalId],
        set: { name: group.name, sourceConfigVersionId: versionId },
      })
  }

  const rows = await scope.select(groups)

  return new Map(rows.map((row) => [row.name, row.id]))
}
