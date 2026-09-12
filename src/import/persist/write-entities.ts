import type { RunScope } from '@/db'
import type { ParsedConfig } from '../types/parsed-config'
import { loadChapterIds } from './load-chapter-ids'
import { upsertBlocks } from './upsert-blocks'
import { upsertCharacters, upsertCharacterScales } from './upsert-characters'
import { upsertFlags } from './upsert-flags'
import { upsertGroups } from './upsert-groups'
import { upsertQuestions } from './upsert-questions'
import { upsertScales } from './upsert-scales'
import { createWrittenRows, type WrittenRows } from './written-rows'

/** Upserts every entity of the config in foreign-key order and reports which rows it wrote. */
export const writeEntities = async (scope: RunScope, config: ParsedConfig): Promise<WrittenRows> => {
  const written = createWrittenRows()

  const groupIds = await upsertGroups(scope, config, written)
  const characterIds = await upsertCharacters(scope, config, written, groupIds)
  const scaleIds = await upsertScales(scope, config, written)
  await upsertCharacterScales(scope, config, written, characterIds, scaleIds)

  const flagIds = await upsertFlags(scope, config, written)
  const chapterIds = await loadChapterIds(scope)
  const blockIds = await upsertBlocks(scope, config, written, characterIds, chapterIds)

  await upsertQuestions(scope, config, written, { characterIds, scaleIds, flagIds, chapterIds, blockIds })

  return written
}
