import type { RunScope } from '@/db'
import { characterScales, characters } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'

export const upsertCharacters = async (
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
  groupIds: IdMap,
): Promise<IdMap> => {
  for (const character of config.characters) {
    const values = {
      firstName: character.firstName,
      lastName: character.lastName,
      homeGroupId: groupIds.get(character.groupName) ?? null,
      templateExternalId: character.templateExternalId || null,
      sourceConfigVersionId: versionId,
    }
    await scope
      .insert(characters, { externalId: character.externalId, ...values })
      .onConflictDoUpdate({ target: [characters.runId, characters.externalId], set: values })
  }

  const rows = await scope.select(characters)

  return new Map(rows.map((row) => [row.externalId, row.id]))
}

/** Chapter-1 starting values from the `Characters` sheet (§4.2). */
export const upsertCharacterScales = async (
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
  characterIds: IdMap,
  scaleIds: IdMap,
): Promise<void> => {
  for (const character of config.characters) {
    const characterId = characterIds.get(character.externalId)
    if (!characterId) continue

    for (const [key, entry] of Object.entries(character.initialScales)) {
      const scaleId = scaleIds.get(key)
      if (!scaleId) continue

      await scope
        .insert(characterScales, {
          characterId,
          scaleId,
          externalId: `S_${character.externalId}_${key}`,
          initialValue: entry.value,
          sourceConfigVersionId: versionId,
        })
        .onConflictDoUpdate({
          target: [characterScales.runId, characterScales.characterId, characterScales.scaleId],
          set: { initialValue: entry.value, sourceConfigVersionId: versionId },
        })
    }
  }
}
