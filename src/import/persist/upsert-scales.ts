import type { RunScope } from '@/db'
import { scaleBands, scales } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'

/**
 * Scales are defined per chapter in the sheet but stored once per run: the
 * definition is per run and scale, never per character (§4.1). A later
 * chapter's definition wins, which is what re-importing means.
 */
export const upsertScales = async (scope: RunScope, config: ParsedConfig, versionId: string): Promise<IdMap> => {
  for (const chapter of config.chapters) {
    for (const scale of config.scales.get(chapter) ?? []) {
      const values = {
        label: scale.label,
        minValue: scale.min,
        maxValue: scale.max,
        scope: scale.scope,
        // Strategy values were checked against the enum by the validation.
        mergeStrategy: (scale.mergeStrategy ?? null) as never,
        splitStrategy: (scale.splitStrategy ?? null) as never,
        sourceConfigVersionId: versionId,
      }
      await scope
        .insert(scales, { key: scale.key, ...values })
        .onConflictDoUpdate({ target: [scales.runId, scales.key], set: values })
    }
  }

  const rows = await scope.select(scales)
  const scaleIds = new Map(rows.map((row) => [row.key, row.id]))

  for (const chapter of config.chapters) {
    for (const scale of config.scales.get(chapter) ?? []) {
      const scaleId = scaleIds.get(scale.key)
      if (!scaleId) continue

      for (const band of scale.bands) {
        await scope
          .insert(scaleBands, {
            scaleId,
            ordinal: band.ordinal,
            minValue: band.min,
            maxValue: band.max,
            name: band.name,
          })
          .onConflictDoUpdate({
            target: [scaleBands.runId, scaleBands.scaleId, scaleBands.ordinal],
            set: { minValue: band.min, maxValue: band.max, name: band.name },
          })
      }
    }
  }

  return scaleIds
}
