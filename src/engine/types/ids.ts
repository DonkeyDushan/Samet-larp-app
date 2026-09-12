/**
 * Identifiers the engine works with (§7).
 *
 * All plain strings: the engine is a pure function and must not depend on how
 * the database spells a primary key (architecture rule 1).
 */

export type CharacterId = string
export type GroupId = string
export type ScaleId = string
export type BandId = string
export type FlagId = string
export type HouseholdId = string
export type QuestionId = string
export type AnswerOptionId = string
export type RuleId = string
/** Template block `{BLOK <ID>}` (§8.4). */
export type BlockId = string

export type ChapterNumber = (typeof CHAPTER_NUMBERS)[number]

/** The game has exactly three chapters (§3.1); a fourth would be a new run. */
export const CHAPTER_NUMBERS = Object.freeze([1, 2, 3] as const)
