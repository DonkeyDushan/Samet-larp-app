import type { RunScope } from '@/db'
import { blockVariations, contentBlocks } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'

/** Blocks and their variants (layer 3, §8.2). */
export const upsertBlocks = async (
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
  characterIds: IdMap,
  chapterIds: IdMap<number>,
): Promise<IdMap> => {
  for (const [chapter, blocks] of config.blocks) {
    const chapterId = chapterIds.get(chapter)
    if (!chapterId) continue

    for (const block of blocks) {
      const characterId = block.characterId ? characterIds.get(block.characterId) : undefined
      if (!characterId) continue

      await scope
        .insert(contentBlocks, {
          externalId: block.externalId,
          chapterId,
          characterId,
          sourceConfigVersionId: versionId,
        })
        .onConflictDoUpdate({
          target: [contentBlocks.runId, contentBlocks.externalId],
          set: { chapterId, characterId, sourceConfigVersionId: versionId },
        })
    }
  }

  const rows = await scope.select(contentBlocks)
  const blockIds = new Map(rows.map((row) => [row.externalId, row.id]))

  for (const blocks of config.blocks.values()) {
    for (const block of blocks) {
      const blockId = blockIds.get(block.externalId)
      if (!blockId) continue

      for (const variation of block.variations) {
        const values = {
          blockId,
          priority: variation.priority,
          description: variation.description || null,
          text: variation.text,
          conditionExpr: variation.condition.raw,
          conditionRefs: variation.condition.references,
        }
        await scope
          .insert(blockVariations, { externalId: variation.externalId, ...values })
          .onConflictDoUpdate({ target: [blockVariations.runId, blockVariations.externalId], set: values })
      }
    }
  }

  return blockIds
}
