import type { RunScope } from '@/db'
import { flags } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'

/** Prefix of flag IDs, dropped from the readable label. */
const FLAG_ID_PREFIX = /^F_/

/** Flags are never declared: they exist by being set by an answer (layer 2). */
export const upsertFlags = async (scope: RunScope, config: ParsedConfig, versionId: string): Promise<IdMap> => {
  const keys = new Set<string>()
  for (const questions of config.questions.values()) {
    for (const question of questions) {
      for (const option of question.options) {
        for (const flag of option.flags) keys.add(flag)
      }
    }
  }

  for (const key of keys) {
    await scope
      .insert(flags, {
        key,
        label: key.replace(FLAG_ID_PREFIX, '').replace(/_/g, ' '),
        sourceConfigVersionId: versionId,
      })
      .onConflictDoUpdate({
        target: [flags.runId, flags.key],
        set: { sourceConfigVersionId: versionId },
      })
  }

  const rows = await scope.select(flags)

  return new Map(rows.map((row) => [row.key, row.id]))
}
