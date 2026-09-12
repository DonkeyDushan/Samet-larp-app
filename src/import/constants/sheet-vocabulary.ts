/** Words the author writes by hand into cells, and what they mean. */

export const QUESTION_TYPES = Object.freeze(['bool', 'single', 'multi', 'scale_direct', 'text'] as const)

/** Structural effects an answer may carry directly (layer 2). */
export const ANSWER_EFFECTS = Object.freeze(['SNATEK', 'ROZVOD', 'VEDENI', 'CLENSTVI', 'ODCHOD'] as const)

/** Effects whose argument is a character ID. */
export const CHARACTER_ARGUMENT_EFFECTS = Object.freeze(['SNATEK', 'ROZVOD'])

/** Effects whose argument is a group name. */
export const GROUP_ARGUMENT_EFFECTS = Object.freeze(['VEDENI', 'CLENSTVI'])

/** Spellings of the `hrac` question source (§6.7), lowercased. */
export const PLAYER_SOURCE_WORDS = Object.freeze(['hráč', 'hrac', 'hráčka', 'hracka'])

export const ORG_SOURCE_WORD = 'org'

/** Truthy spellings in the `Parova` column, lowercased. */
export const YES_WORDS = Object.freeze(['ano', 'true', 'x', '1'])

/** Both spellings of the household scope. */
export const HOUSEHOLD_SCOPE_WORDS = Object.freeze(['domacnost', 'domácnost'])

/** Answer ID suffix or answer text marking free text filled in by the org. */
export const OTHER_ANSWER_MARKER = '_OTHER_'

/** Separators accepted in list cells (`Blocks`, `Flags`, `Effects`). */
export const LIST_SEPARATOR = /[,;]/

/** Separator between bands in `Prahy` and `Nazvy pasem`. */
export const BAND_SEPARATOR = ';'
