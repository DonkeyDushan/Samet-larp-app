import type { RunScope } from '@/db'
import { characterScales, characters } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

export const upsertCharacters = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  groupIds: IdMap,
): Promise<IdMap> => {
  const characterIds: IdMap = new Map()

  for (const character of config.characters) {
    const values = {
      firstName: character.firstName,
      lastName: character.lastName,
      homeGroupId: groupIds.get(character.groupName) ?? null,
      templateExternalId: character.templateExternalId || null,
    }
    const [row] = await scope
      .insert(characters, { externalId: character.externalId, ...values })
      .onConflictDoUpdate({ target: [characters.runId, characters.externalId], set: values })
      .returning({ id: characters.id })
    if (!row) continue

    written.characters.add(row.id)
    characterIds.set(character.externalId, row.id)
  }

  return characterIds
}

/** Chapter-1 starting values from the `Characters` sheet (§4.2). */
export const upsertCharacterScales = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  characterIds: IdMap,
  scaleIds: IdMap,
): Promise<void> => {
  for (const character of config.characters) {
    const characterId = characterIds.get(character.externalId)
    if (!characterId) continue

    for (const [key, entry] of Object.entries(character.initialScales)) {
      const scaleId = scaleIds.get(key)
      if (!scaleId) continue

      const [row] = await scope
        .insert(characterScales, {
          characterId,
          scaleId,
          externalId: `S_${character.externalId}_${key}`,
          initialValue: entry.value,
        })
        .onConflictDoUpdate({
          target: [characterScales.runId, characterScales.characterId, characterScales.scaleId],
          set: { initialValue: entry.value },
        })
        .returning({ id: characterScales.id })
      if (row) written.characterScales.add(row.id)
    }
  }
}
