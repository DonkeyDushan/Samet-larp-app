import type { RunScope } from '@/db'
import type { ParsedConfig } from '../types/parsed-config'
import { loadChapterIds } from './load-chapter-ids'
import { upsertBlocks } from './upsert-blocks'
import { upsertCharacters, upsertCharacterScales } from './upsert-characters'
import { upsertFlags } from './upsert-flags'
import { upsertGroups } from './upsert-groups'
import { upsertQuestions } from './upsert-questions'
import { upsertScales } from './upsert-scales'

/** Upserts every entity of the config, stamping it with this version. Order follows the foreign keys. */
export const writeEntities = async (scope: RunScope, config: ParsedConfig, versionId: string): Promise<void> => {
  const groupIds = await upsertGroups(scope, config, versionId)
  const characterIds = await upsertCharacters(scope, config, versionId, groupIds)
  const scaleIds = await upsertScales(scope, config, versionId)
  await upsertCharacterScales(scope, config, versionId, characterIds, scaleIds)

  const flagIds = await upsertFlags(scope, config, versionId)
  const chapterIds = await loadChapterIds(scope)
  const blockIds = await upsertBlocks(scope, config, versionId, characterIds, chapterIds)

  await upsertQuestions(scope, config, versionId, { characterIds, scaleIds, flagIds, chapterIds, blockIds })
}
