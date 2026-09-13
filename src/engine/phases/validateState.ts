/**
 * The input state must match the config and hold the household invariants
 * (§4.4): every character in exactly one existing household, shared values
 * only on households.
 */
import type { Catalog } from '../catalog/buildCatalog'
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { RunState } from '../types/state'

export const validateState = (state: RunState, catalog: Catalog): void => {
  const problems: EngineProblem[] = []
  const report = (subject: string, detail: string): void => {
    problems.push({ code: 'nekonzistentni_stav', subject, detail })
  }

  for (const characterId of catalog.characterIds) {
    if (!state.characters[characterId]) report(characterId, 'character from the config is missing in the state')
  }

  for (const [characterId, character] of Object.entries(state.characters)) {
    if (!catalog.characters.has(characterId)) report(characterId, 'character is not in the config')

    const household = state.households[character.householdId]
    if (!household?.memberIds.includes(characterId)) {
      report(characterId, `household ${character.householdId} does not list the character`)
    }
    for (const scaleKey of Object.keys(character.scales)) {
      if (catalog.scales.get(scaleKey)?.scope !== 'postava') report(characterId, `${scaleKey} is not a character scale`)
    }
  }

  for (const [householdId, household] of Object.entries(state.households)) {
    for (const memberId of household.memberIds) {
      if (state.characters[memberId]?.householdId !== householdId) {
        report(householdId, `member ${memberId} belongs to another household`)
      }
    }
    for (const scaleKey of Object.keys(household.scales)) {
      if (catalog.scales.get(scaleKey)?.scope !== 'domacnost') report(householdId, `${scaleKey} is not a household scale`)
    }
  }

  for (const groupId of catalog.groupIds) {
    if (!state.groups[groupId]) report(groupId, 'group from the config is missing in the state')
  }

  failIfAny(problems)
}
