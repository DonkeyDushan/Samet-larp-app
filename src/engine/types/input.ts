/** Recorded answers and rolls — the second argument of `evaluate`. */
import type { AnswerOptionId, CharacterId, QuestionId, RuleId } from './ids'

/**
 * A recorded answer. An answer absent from the list counts as missing — the
 * engine fills in nothing and the computation must not finish (§6.3).
 */
export interface AnswerInput {
  questionId: QuestionId
  characterId: CharacterId
  boolValue?: boolean
  numericValue?: number
  textValue?: string
  selectedOptionIds?: AnswerOptionId[]
  filledByOrg: boolean
}

/**
 * An already rolled die. The engine never rolls (§7.4); a missing roll blocks
 * the computation the same way a missing answer does.
 */
export interface DiceInput {
  ruleId: RuleId
  characterId: CharacterId
  sides: number
  value: number
}

export interface EvaluationInputs {
  answers: AnswerInput[]
  dice: DiceInput[]
}
