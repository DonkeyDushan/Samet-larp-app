/** Reading and writing values in a working state, whoever owns them (§4.4). */
import { fail } from '../errors/engineInputError'
import type { CharacterId, GroupId, HouseholdId, ScaleKey } from '../types/ids'
import type { ScaleDefinition } from '../types/scale'
import type { ScaleOwner } from '../types/source'
import type { CharacterState, GroupState, HouseholdState, RunState } from '../types/state'

export const characterStateOf = (state: RunState, characterId: CharacterId): CharacterState =>
  state.characters[characterId] ?? fail('nekonzistentni_stav', characterId, 'character is missing from the state')

export const householdStateOf = (state: RunState, householdId: HouseholdId): HouseholdState =>
  state.households[householdId] ?? fail('nekonzistentni_stav', householdId, 'household is missing from the state')

export const groupStateOf = (state: RunState, groupId: GroupId): GroupState =>
  state.groups[groupId] ?? fail('nekonzistentni_stav', groupId, 'group is missing from the state')

export const householdOfCharacter = (state: RunState, characterId: CharacterId): HouseholdState =>
  householdStateOf(state, characterStateOf(state, characterId).householdId)

/** Resolved against the current membership, so a marriage from phase 3 already counts (§7.3). */
export const ownerOf = (state: RunState, scale: ScaleDefinition, characterId: CharacterId): ScaleOwner => {
  if (scale.scope === 'postava') return { kind: 'postava', characterId }

  const household = householdOfCharacter(state, characterId)

  return { kind: 'domacnost', householdId: household.householdId, memberIds: [...household.memberIds] }
}

const valuesOf = (state: RunState, owner: ScaleOwner): Record<ScaleKey, number> => {
  if (owner.kind === 'postava') return characterStateOf(state, owner.characterId).scales

  return householdStateOf(state, owner.householdId).scales
}

export const readScale = (state: RunState, owner: ScaleOwner, scaleKey: ScaleKey): number | undefined =>
  valuesOf(state, owner)[scaleKey]

export const writeScale = (state: RunState, owner: ScaleOwner, scaleKey: ScaleKey, value: number): void => {
  valuesOf(state, owner)[scaleKey] = value
}
