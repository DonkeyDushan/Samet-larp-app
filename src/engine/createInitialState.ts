/** State before chapter 1, from the `Characters` sheet (§4.2). */
import { buildCatalog } from './catalog/buildCatalog'
import { scaleOf } from './catalog/scaleOf'
import { fail } from './errors/engineInputError'
import type { EngineConfig } from './types/config'
import type { CharacterState, HouseholdState, RunState } from './types/state'
import { initialHouseholdId } from './utils/householdIds'
import { normalizeState } from './utils/normalizeState'
import { findBand } from './utils/scaleMath'

export const createInitialState = (config: EngineConfig): RunState => {
  const catalog = buildCatalog(config)
  const state: RunState = { completedChapter: 0, characters: {}, households: {}, groups: {} }

  for (const groupId of catalog.groupIds) state.groups[groupId] = { groupId, memberIds: [] }

  for (const characterId of catalog.characterIds) {
    const definition = catalog.characters.get(characterId) ?? fail('neznamy_odkaz', characterId, 'unknown character')
    const householdId = initialHouseholdId(characterId)
    const character: CharacterState = { characterId, householdId, scales: {}, bands: {}, flags: {} }
    // A household of one for everyone, so the engine never branches on "no household" (§4.4).
    const household: HouseholdState = { householdId, memberIds: [characterId], scales: {}, bands: {} }

    for (const [scaleKey, value] of Object.entries(definition.initialScales)) {
      const scale = scaleOf(catalog, scaleKey)
      const owner = scale.scope === 'postava' ? character : household
      owner.scales[scaleKey] = value
      const band = findBand(scale, value)
      if (band) owner.bands[scaleKey] = band.ordinal
    }

    state.characters[characterId] = character
    state.households[householdId] = household
    if (definition.groupId !== undefined) state.groups[definition.groupId]?.memberIds.push(characterId)
  }

  return normalizeState(state)
}
