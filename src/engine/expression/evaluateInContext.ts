import { fail } from '../errors/engineInputError'
import type { EvaluationContext } from '../evaluationContext'
import type { CompiledCondition } from '../types/condition'
import type { CharacterId } from '../types/ids'
import type { RollRequest } from '../types/result'
import { rollKey } from '../utils/keys'
import { characterStateOf, ownerOf, readScale } from '../utils/stateAccess'
import { evaluateCondition, type ConditionOutcome } from './evaluateCondition'

/**
 * Evaluates against the context's current working state. `characterId` owns
 * the unqualified flags and, with `rollOwner`, identifies the stored roll.
 */
export const evaluateInContext = (
  context: EvaluationContext,
  condition: CompiledCondition,
  characterId: CharacterId,
  rollOwner: Omit<RollRequest, 'characterId'>,
): ConditionOutcome => {
  const key = rollKey(rollOwner.ownerKind, rollOwner.ownerId, characterId)

  const outcome = evaluateCondition(condition, {
    isChosen: (optionId, questionId) => {
      // Unanswered is not "not chosen": that would be a silent default answer (§6.3).
      if (!context.answers.byQuestion.has(questionId)) {
        return fail('chybi_odpoved', questionId, `a condition reads ${optionId}, but the question has no answer`)
      }

      return context.answers.chosen.has(optionId)
    },
    hasFlag: (flagId) => characterStateOf(context.state, characterId).flags[flagId] === true,
    scaleValue: (ownerCharacterId, scaleKey) => {
      const scale = context.catalog.scales.get(scaleKey)
      if (!scale) return undefined

      return readScale(context.state, ownerOf(context.state, scale, ownerCharacterId), scaleKey)
    },
    roll: () => context.rolls.get(key),
  })

  if (outcome.needsRoll) context.missingRolls.set(key, { ...rollOwner, characterId })

  return outcome
}
