/**
 * Evaluates a compiled condition in three-valued (Kleene) logic.
 *
 * Unknown comes from a missing roll or a value left open for the org. `false
 * AND unknown` is still `false`, so a roll is requested only when it can change
 * the result (§7.4).
 */
import type {
  ComparisonOperator,
  CompiledCondition,
  CompiledNumber,
  ConditionReading,
  ConditionResult,
} from '../types/condition'
import type { AnswerOptionId, CharacterId, FlagId, QuestionId, ScaleKey } from '../types/ids'

export interface ConditionEnvironment {
  isChosen: (optionId: AnswerOptionId, questionId: QuestionId) => boolean
  /** Flags of the character the condition belongs to. */
  hasFlag: (flagId: FlagId) => boolean
  scaleValue: (characterId: CharacterId, scaleKey: ScaleKey) => number | undefined
  roll: () => number | undefined
}

export interface ConditionOutcome {
  result: ConditionResult
  readings: ConditionReading[]
  /** The result is unknown and a stored roll could settle it. */
  needsRoll: boolean
}

/** `null` is unknown. */
type Truth = boolean | null

const compare = (operator: ComparisonOperator, left: number, right: number): boolean => {
  switch (operator) {
    case '==':
      return left === right
    case '!=':
      return left !== right
    case '>':
      return left > right
    case '<':
      return left < right
    case '>=':
      return left >= right
    case '<=':
      return left <= right
  }
}

const toResult = (truth: Truth): ConditionResult => {
  if (truth === null) return 'neznamo'

  return truth ? 'plati' : 'neplati'
}

export const evaluateCondition = (condition: CompiledCondition, environment: ConditionEnvironment): ConditionOutcome => {
  const readings: ConditionReading[] = []
  const seen = new Set<string>()
  let rollMissing = false

  const read = (reference: string, value: boolean | number | null): void => {
    if (seen.has(reference)) return
    seen.add(reference)
    readings.push({ reference, value })
  }

  const numberOf = (operand: CompiledNumber): number | null => {
    if (operand.kind === 'number') return operand.value

    const value = environment.scaleValue(operand.characterId, operand.scaleKey) ?? null
    read(operand.reference, value)

    return value
  }

  const truthOf = (node: CompiledCondition): Truth => {
    switch (node.kind) {
      case 'always':
        return true
      case 'answer': {
        const chosen = environment.isChosen(node.optionId, node.questionId)
        read(node.optionId, chosen)

        return chosen
      }
      case 'flag': {
        const set = environment.hasFlag(node.flagId)
        read(node.flagId, set)

        return set
      }
      case 'random': {
        const roll = environment.roll()
        read(node.reference, roll ?? null)
        if (roll === undefined) {
          rollMissing = true

          return null
        }

        return roll <= node.percent
      }
      case 'not': {
        const operand = truthOf(node.operand)

        return operand === null ? null : !operand
      }
      case 'and': {
        const left = truthOf(node.left)
        if (left === false) return false
        const right = truthOf(node.right)
        if (right === false) return false

        return left === null || right === null ? null : true
      }
      case 'or': {
        const left = truthOf(node.left)
        if (left === true) return true
        const right = truthOf(node.right)
        if (right === true) return true

        return left === null || right === null ? null : false
      }
      case 'compare': {
        const left = numberOf(node.left)
        const right = numberOf(node.right)

        return left === null || right === null ? null : compare(node.operator, left, right)
      }
    }
  }

  const truth = truthOf(condition)

  return { result: toResult(truth), readings, needsRoll: truth === null && rollMissing }
}
