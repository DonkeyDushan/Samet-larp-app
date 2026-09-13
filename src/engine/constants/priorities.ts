/**
 * Priority of layer 1 and 2 effects, which carry none of their own. Equal to a
 * rule's default priority, so a rule contradicting an answer without raising
 * its priority becomes a conflict for the org, not a silent override (§7.3).
 */
export const ANSWER_EFFECT_PRIORITY = 0
