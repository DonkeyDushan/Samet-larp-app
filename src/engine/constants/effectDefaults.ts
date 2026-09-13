/** An effect without a weight counts once (§7.2). */
export const DEFAULT_EFFECT_WEIGHT = 1

/** `polovina` splits a shared value between the leaving and the staying household (§4.4). */
export const HALF_SPLIT_DIVISOR = 2

/** Question types whose options apply without being selected: the answer is a number or text. */
export const IMPLICIT_OPTION_TYPES = Object.freeze(['scale_direct', 'text'] as const)

/** Question types answered by exactly one option. */
export const SINGLE_CHOICE_TYPES = Object.freeze(['bool', 'single'] as const)
