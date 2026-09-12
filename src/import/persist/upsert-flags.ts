import type { RunScope } from '@/db'
import { flags } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

/** Prefix of flag IDs, dropped from the readable label. */
const FLAG_ID_PREFIX = /^F_/

/** Flags are never declared: they exist by being set by an answer (layer 2). */
export const upsertFlags = async (scope: RunScope, config: ParsedConfig, written: WrittenRows): Promise<IdMap> => {
  const keys = new Set<string>()
  for (const questions of config.questions.values()) {
    for (const question of questions) {
      for (const option of question.options) {
        for (const flag of option.flags) keys.add(flag)
      }
    }
  }

  const flagIds: IdMap = new Map()

  for (const key of keys) {
    const label = key.replace(FLAG_ID_PREFIX, '').replace(/_/g, ' ')
    const [row] = await scope
      .insert(flags, { key, label })
      .onConflictDoUpdate({ target: [flags.runId, flags.key], set: { label } })
      .returning({ id: flags.id })
    if (!row) continue

    written.flags.add(row.id)
    flagIds.set(key, row.id)
  }

  return flagIds
}
