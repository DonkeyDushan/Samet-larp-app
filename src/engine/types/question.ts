/**
 * Questions and their answer options (§6.6, §6.7).
 *
 * Neither the source (`hrac` / `org`) nor pairing is here: the engine does not
 * tell them apart, they are a different input source, not a mechanism.
 */
import type { EffectDefinition } from './effect'
import type { AnswerOptionId, ChapterNumber, CharacterId, QuestionId } from './ids'

export type QuestionType = 'bool' | 'single' | 'multi' | 'scale_direct' | 'text'

export interface QuestionDefinition {
  id: QuestionId
  chapter: ChapterNumber
  /** Questions are per character; there is no shared set (§6.6). */
  characterId: CharacterId
  type: QuestionType
  options: AnswerOptionDefinition[]
}

export interface AnswerOptionDefinition {
  id: AnswerOptionId
  /** Naming another character means a registry ID, never free text (§6.6). */
  referencedCharacterId?: CharacterId
  effects: EffectDefinition[]
}
