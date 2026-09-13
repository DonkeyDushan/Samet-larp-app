/**
 * The condition language (§4.5). The engine owns it; the import only reports
 * syntax problems in the author's words, so both read the same definition.
 */

/** Always-true fallback variant (§8.2); it stands alone, never inside an expression. */
export const DEFAULT_CONDITION = 'DEFAULT'

/** The only function a condition may call (§4.5). */
export const RANDOM_FUNCTION = 'RANDOM'

/** `RANDOM(n)` takes a probability in percent. */
export const RANDOM_MIN_PERCENT = 0

export const RANDOM_MAX_PERCENT = 100

/** A stored roll is 1–100, so `RANDOM(p)` holds exactly when the roll is at most `p` (§7.4). */
export const ROLL_MIN = 1

export const ROLL_MAX = 100

/** ID prefixes from §4.2. */
export const ANSWER_PREFIX = 'A_'

export const SCALE_PREFIX = 'S_'

export const FLAG_PREFIX = 'F_'

/** `S_<Postava>_<Skala>`: character IDs carry no `_`, so the first one splits the ID. */
export const SCALE_ID_SEPARATOR = '_'

/** `AND` binds tighter than `OR`, matching how the author reads the sheet. */
export const AND_OPERATOR = 'AND'

export const AND_PRECEDENCE = 2

export const OR_OPERATOR = 'OR'

export const OR_PRECEDENCE = 1

export const NOT_OPERATOR = '!'

/** The author writes `=`; it is rewritten to `==` before parsing. */
export const COMPARISON_OPERATORS = Object.freeze(['==', '!=', '>', '<', '>=', '<='] as const)
