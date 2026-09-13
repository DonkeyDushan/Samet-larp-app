/** Second argument of `evaluate`: the recorded answers and rolls. */
import type { AnswerOptionId, ChapterNumber, CharacterId, QuestionId, RuleId, VariationId } from './ids'

/**
 * A recorded answer. There are no default answers (§6.3): a question of the
 * computed chapter without one stops the computation.
 */
export interface AnswerInput {
  questionId: QuestionId
  /**
   * `bool` and `single` exactly one option, `multi` any number. `scale_direct`
   * and `text` select nothing — all their options apply implicitly.
   */
  selectedOptionIds: AnswerOptionId[]
  /** Required by `scale_direct`. */
  numericValue?: number
  textValue?: string
  filledByOrg: boolean
}

/**
 * A stored roll (§7.4), 1–100. The engine never rolls: it reads these and lists
 * the ones it still needs.
 */
export interface RollInput {
  ownerKind: 'varianta' | 'pravidlo'
  ownerId: VariationId | RuleId
  characterId: CharacterId
  value: number
}

export interface EvaluationInputs {
  chapter: ChapterNumber
  /** Every chapter up to and including `chapter`. */
  answers: AnswerInput[]
  /** Rolls of `chapter` only. */
  rolls: RollInput[]
}
