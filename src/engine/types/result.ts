/** What `evaluate` returns. */
import type { Conflict } from './conflict'
import type { BlockId, CharacterId, RuleId, VariationId } from './ids'
import type { RunState } from './state'
import type { TraceEntry } from './trace'

/** A roll the computation needs and does not have; the caller rolls, stores it and runs again. */
export interface RollRequest {
  ownerKind: 'varianta' | 'pravidlo'
  ownerId: VariationId | RuleId
  characterId: CharacterId
}

export interface VariantSelection {
  blockId: BlockId
  characterId: CharacterId
  /** Undecided while a roll is missing or a value the condition reads is left open. */
  status: 'vybrana' | 'nerozhodnuto'
  variationId: VariationId | null
  /** Empty string is a valid text: the marker vanishes (§8.2). */
  text: string | null
}

/**
 * The result is final only when `conflicts` and `missingRolls` are both empty;
 * otherwise it is a draft that cannot be confirmed.
 */
export interface EvaluateResult {
  /** A new object; the input state is never modified. */
  state: RunState
  trace: TraceEntry[]
  conflicts: Conflict[]
  missingRolls: RollRequest[]
  variants: VariantSelection[]
}
