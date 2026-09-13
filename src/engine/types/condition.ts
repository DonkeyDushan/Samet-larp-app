/** A condition compiled from the author's expression, with every reference resolved. */
import type { COMPARISON_OPERATORS } from '../constants/expressionLanguage'
import type { AnswerOptionId, CharacterId, FlagId, QuestionId, ScaleKey } from './ids'

export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number]

export type CompiledNumber =
  | { kind: 'scale'; reference: string; characterId: CharacterId; scaleKey: ScaleKey }
  | { kind: 'number'; value: number }

export type CompiledCondition =
  | { kind: 'always' }
  | { kind: 'answer'; optionId: AnswerOptionId; questionId: QuestionId }
  | { kind: 'flag'; flagId: FlagId }
  | { kind: 'random'; reference: string; percent: number }
  | { kind: 'not'; operand: CompiledCondition }
  | { kind: 'and' | 'or'; left: CompiledCondition; right: CompiledCondition }
  | { kind: 'compare'; operator: ComparisonOperator; left: CompiledNumber; right: CompiledNumber }

/** `neznamo`: a roll is missing or a value was left for the org to settle. */
export type ConditionResult = 'plati' | 'neplati' | 'neznamo'

/** A value the evaluation actually read, so the UI can explain the result without re-running it. */
export interface ConditionReading {
  /** As the author wrote it: `A_Marie_2_1_Mirek`, `S_Marie_Wealth_spolecny`, `RANDOM(50)`. */
  reference: string
  /** `null` when the value was not available. */
  value: boolean | number | null
}
