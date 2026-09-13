/** Where a change came from and whose value it touched — the core of every "why". */
import type { AnswerOptionId, CharacterId, HouseholdId, QuestionId, RuleId } from './ids'

export type EffectSource =
  | {
      kind: 'odpoved'
      /**
       * The answering character. On a shared scale this is the only way to say
       * Marie's money changed because of Mirek's answer (§4.4).
       */
      characterId: CharacterId
      questionId: QuestionId
      optionId: AnswerOptionId
      filledByOrg: boolean
    }
  | { kind: 'pravidlo'; ruleId: RuleId; characterId: CharacterId }

/** `memberIds` is a snapshot, so the UI can name the other account holder without the state. */
export type ScaleOwner =
  | { kind: 'postava'; characterId: CharacterId }
  | { kind: 'domacnost'; householdId: HouseholdId; memberIds: CharacterId[] }
