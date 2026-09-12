/** Questions and their answer options (§6.6, §6.7). */
import type { Effect } from './effect'
import type { AnswerOptionId, ChapterNumber, CharacterId, QuestionId, ScaleId } from './ids'

export interface QuestionDefinition {
  id: QuestionId
  externalId: string
  /** Questions are per character; there is no shared set (§6.6). */
  characterId: CharacterId
  chapter: ChapterNumber
  type: 'bool' | 'single' | 'multi' | 'scale_direct' | 'text'
  ordinal: number
  text: string
  /**
   * Input source only, not a different mechanism (§6.7) — with one exception:
   * `scale_direct` from the org sets the value absolutely at the start of the
   * value phase (see `TracePhase`).
   */
  source: 'hrac' | 'org'
  /**
   * Paired question, i.e. marriage (§6.7). There is a single answer row, not
   * two mirrored ones, so the engine must not expect one from the other
   * character too.
   */
  isPaired: boolean
  /** Target scale for `scale_direct`. */
  scaleId?: ScaleId
  options: AnswerOptionDefinition[]
}

export interface AnswerOptionDefinition {
  id: AnswerOptionId
  externalId: string
  label: string
  /** Naming another character means a registry ID, never free text (§6.6). */
  referencedCharacterId?: CharacterId
  isOther: boolean
  effects: Effect[]
}
