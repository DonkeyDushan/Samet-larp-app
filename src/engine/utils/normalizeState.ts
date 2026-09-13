/**
 * Sorted keys and member lists: `JSON.stringify` of the result is then the same
 * for the same input, whatever order the phases touched things in.
 */
import type { GroupState, RunState } from '../types/state'
import { compareIds } from './compareIds'

const sortRecord = <T>(record: Record<string, T>, map: (value: T) => T = (value) => value): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record)
      .sort(([a], [b]) => compareIds(a, b))
      .map(([key, value]) => [key, map(value)]),
  )

const sortedIds = (ids: string[]): string[] => [...ids].sort(compareIds)

const normalizeGroup = (group: GroupState): GroupState => {
  const memberIds = sortedIds(group.memberIds)
  if (group.leaderId === undefined) return { groupId: group.groupId, memberIds }

  return { groupId: group.groupId, memberIds, leaderId: group.leaderId }
}

export const normalizeState = (state: RunState): RunState => ({
  completedChapter: state.completedChapter,
  characters: sortRecord(state.characters, (character) => ({
    characterId: character.characterId,
    householdId: character.householdId,
    scales: sortRecord(character.scales),
    bands: sortRecord(character.bands),
    flags: sortRecord(character.flags),
  })),
  households: sortRecord(state.households, (household) => ({
    householdId: household.householdId,
    memberIds: sortedIds(household.memberIds),
    scales: sortRecord(household.scales),
    bands: sortRecord(household.bands),
  })),
  groups: sortRecord(state.groups, normalizeGroup),
})
