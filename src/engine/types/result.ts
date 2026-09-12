/** What `evaluate` returns, and its signature. */
import type { BlockId, CharacterId, GroupId, HouseholdId, QuestionId, RuleId, ScaleId } from './ids'
import type { EvaluationInputs } from './input'
import type { RuleSet } from './rule'
import type { RunState } from './state'
import type { TraceEntry } from './trace'

/**
 * Two rules of equal priority produced opposite results. The engine does not
 * decide — it hands this to the UI for the org to resolve (§7.3).
 */
export interface Conflict {
  id: string
  characterId?: CharacterId
  householdId?: HouseholdId
  subject: {
    kind: 'skala' | 'priznak' | 'blok' | 'skupina' | 'domacnost'
    id: string
    label: string
  }
  priority: number
  candidates: { ruleId: RuleId; ruleName: string; proposed: number | string | boolean }[]
}

/** Missing input — the computation cannot finish (§6.3). */
export interface MissingInput {
  kind: 'odpoved' | 'hod'
  characterId: CharacterId
  questionId?: QuestionId
  ruleId?: RuleId
  label: string
}

/**
 * Scale clamped at a bound (§4.1). Reported separately and written to the
 * audit log because it signals badly tuned weights.
 */
export interface ClampEvent {
  characterId?: CharacterId
  householdId?: HouseholdId
  scaleId: ScaleId
  rawValue: number
  clampedValue: number
  bound: 'min' | 'max'
}

/** Template block to keep; the rest are deleted (§8.2). */
export interface SelectedBlock {
  characterId?: CharacterId
  groupId?: GroupId
  blockId: BlockId
  ruleId?: RuleId
}

/** Flag for the org: "event X happened → pull document 42" (§8.7). */
export interface OutputTag {
  characterId?: CharacterId
  code: string
  note?: string
  ruleId?: RuleId
}

export interface EvaluateResult {
  /** The input state is not modified — the engine is pure. */
  state: RunState
  trace: TraceEntry[]
  /** Non-empty blocks confirming the computation (§7.3). */
  conflicts: Conflict[]
  /** Non-empty blocks running the computation at all (§6.3). */
  missingInputs: MissingInput[]
  clamps: ClampEvent[]
  selectedBlocks: SelectedBlock[]
  tags: OutputTag[]
}

/**
 * The engine's only entry point. Pure: same input, same output — randomness
 * enters only as an already rolled value in `inputs.dice`.
 */
export type EvaluateFn = (
  state: RunState,
  inputs: EvaluationInputs,
  ruleSet: RuleSet,
) => EvaluateResult
