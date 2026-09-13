/**
 * Identifiers the engine works with — always the author's IDs from the sheet
 * (`Marie`, `Q_Marie_2_1`, `Wealth_osobni`), never database keys: conditions
 * name them, and the trace has to stay readable without a lookup.
 */

export type CharacterId = string
export type GroupId = string
/** Scale key without the character part, e.g. `Wealth_osobni`. */
export type ScaleKey = string
export type FlagId = string
export type HouseholdId = string
export type QuestionId = string
export type AnswerOptionId = string
export type RuleId = string
/** Template block `{BLOK <ID>}` (§8.4). */
export type BlockId = string
export type VariationId = string

export type ChapterNumber = (typeof CHAPTER_NUMBERS)[number]

/** The game has exactly three chapters (§3.1); a fourth would be a new run. */
export const CHAPTER_NUMBERS = Object.freeze([1, 2, 3] as const)
