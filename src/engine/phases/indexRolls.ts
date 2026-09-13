import { ROLL_MAX, ROLL_MIN } from '../constants/expressionLanguage'
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { RollInput } from '../types/input'
import { rollKey } from '../utils/keys'

/** Stored rolls by owner and character. A roll is data like an answer, never generated here (§7.4). */
export const indexRolls = (rolls: RollInput[]): Map<string, number> => {
  const problems: EngineProblem[] = []
  const index = new Map<string, number>()

  for (const roll of rolls) {
    const key = rollKey(roll.ownerKind, roll.ownerId, roll.characterId)
    if (index.has(key)) {
      problems.push({ code: 'neplatny_hod', subject: key, detail: 'stored twice' })
      continue
    }
    if (!Number.isInteger(roll.value) || roll.value < ROLL_MIN || roll.value > ROLL_MAX) {
      problems.push({ code: 'neplatny_hod', subject: key, detail: `${roll.value} is outside ${ROLL_MIN}–${ROLL_MAX}` })
      continue
    }
    index.set(key, roll.value)
  }

  failIfAny(problems)

  return index
}
