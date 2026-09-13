/** Layer 4 rules from the optional `N_Rules` sheet (§4.5, §7.1). */
import type { EffectDefinition } from './effect'
import type { ChapterNumber, CharacterId, RuleId } from './ids'

/**
 * `CONDITION → EFFECT [priority]`.
 *
 * The condition is read against the state at the start of the chapter plus this
 * chapter's answers: reading values the same chapter is still changing would
 * make the result depend on evaluation order.
 */
export interface Rule {
  id: RuleId
  /** Absent means every chapter. */
  chapter?: ChapterNumber
  /**
   * Absent means the rule is evaluated for every character in turn; that
   * character owns unqualified flags and is the default effect target.
   */
  characterId?: CharacterId
  priority: number
  condition: string
  /** The rule prevents the outcomes in `effects`; exclusion always wins over assignment (§7.3). */
  isExclusion: boolean
  /** Without it, member effects on a shared scale add up (§4.4). */
  appliesOncePerHousehold: boolean
  effects: EffectDefinition[]
}
