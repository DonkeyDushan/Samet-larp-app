/**
 * Trace — the data behind every "why" in the UI (§7.5).
 *
 * Labelled data, never finished sentences: the wording belongs to the UI and
 * must be changeable without recomputing. The array order is the order of
 * evaluation, and it does not depend on row order in the sheet.
 */
import type { ConditionReading, ConditionResult } from './condition'
import type { ConflictSubject, PendingReason } from './conflict'
import type { ResolvedEffect } from './effect'
import type { BlockId, CharacterId, FlagId, GroupId, HouseholdId, RuleId, ScaleKey, VariationId } from './ids'
import type { MergeStrategy, SplitStrategy } from './scale'
import type { EffectSource, ScaleOwner } from './source'

/**
 * Fixed evaluation order (§7.3). `varianty` follows the six phases: variations
 * are chosen against the finished state.
 */
export type TracePhase = 'sber' | 'vylouceni' | 'strukturalni' | 'hodnotove' | 'pasma' | 'konflikty' | 'varianty'

export interface HouseholdSnapshot {
  householdId: HouseholdId
  memberIds: CharacterId[]
  scales: Record<ScaleKey, number>
}

/** A shared value through a merge or split, with every original value (§4.4). */
export interface HouseholdScaleChange {
  scaleKey: ScaleKey
  strategy: MergeStrategy | SplitStrategy
  inputs: { householdId: HouseholdId; value: number | null }[]
  /** `null` when the value was left open; `pending` says why. */
  value: number | null
  pending?: PendingReason
}

export interface ScaleContribution {
  source: EffectSource
  /** Weight already applied. */
  delta: number
  weight: number
  /** Not counted: the rule already hit this household (§4.4). */
  ignored?: 'jednou_za_domacnost'
}

export interface BandRef {
  ordinal: number
  name: string
}

export interface VariantEvaluation {
  variationId: VariationId
  priority: number
  result: ConditionResult
  readings: ConditionReading[]
}

/** A rule whose condition held or could not be decided; rules that did not hold are omitted. */
export interface RuleTrace {
  phase: 'sber'
  kind: 'pravidlo'
  ruleId: RuleId
  characterId: CharacterId
  result: ConditionResult
  readings: ConditionReading[]
}

export interface ExclusionTrace {
  phase: 'vylouceni'
  kind: 'vylouceni'
  effect: ResolvedEffect
  source: EffectSource
  excludedBy: EffectSource[]
}

/** Lost to a higher priority. */
export interface OverriddenTrace {
  phase: 'strukturalni' | 'hodnotove'
  kind: 'prekonano'
  subject: ConflictSubject
  effect: ResolvedEffect
  source: EffectSource
  priority: number
  winners: EffectSource[]
  winnerPriority: number
}

export interface ConflictTrace {
  phase: TracePhase
  kind: 'konflikt'
  /** Index into `EvaluateResult.conflicts`. */
  conflictIndex: number
}

export interface HouseholdMergeTrace {
  phase: 'strukturalni'
  kind: 'domacnost_slouceni'
  characterIds: [CharacterId, CharacterId]
  sources: EffectSource[]
  before: HouseholdSnapshot[]
  after: HouseholdSnapshot
  scales: HouseholdScaleChange[]
}

export interface HouseholdSplitTrace {
  phase: 'strukturalni'
  kind: 'domacnost_rozdeleni'
  characterId: CharacterId
  sources: EffectSource[]
  before: HouseholdSnapshot
  after: HouseholdSnapshot[]
  scales: HouseholdScaleChange[]
}

export interface MembershipTrace {
  phase: 'strukturalni'
  kind: 'clenstvi'
  groupId: GroupId
  characterId: CharacterId
  action: 'pridat' | 'odebrat'
  before: boolean
  after: boolean
  sources: EffectSource[]
}

export interface LeadershipTrace {
  phase: 'strukturalni'
  kind: 'vedeni'
  groupId: GroupId
  before: CharacterId | null
  after: CharacterId | null
  sources: EffectSource[]
}

/** Visible on its own, apart from the shifts that follow it (§6.7). */
export interface ScaleSetTrace {
  phase: 'hodnotove'
  kind: 'nastaveni_skaly'
  owner: ScaleOwner
  scaleKey: ScaleKey
  before: number | null
  after: number
  sources: EffectSource[]
}

/** Written even when the contributions cancel out — "nothing changed" needs explaining too. */
export interface ScaleShiftTrace {
  phase: 'hodnotove'
  kind: 'zmena_skaly'
  owner: ScaleOwner
  scaleKey: ScaleKey
  /** `null` when the value is left open for the org. */
  before: number | null
  raw: number | null
  after: number | null
  contributions: ScaleContribution[]
}

/** A signal of badly tuned weights, not a detail to hide (§4.1). */
export interface ClampTrace {
  phase: 'strukturalni' | 'hodnotove'
  kind: 'orez'
  owner: ScaleOwner
  scaleKey: ScaleKey
  raw: number
  after: number
  bound: 'min' | 'max'
}

export interface FlagTrace {
  phase: 'hodnotove'
  kind: 'priznak'
  characterId: CharacterId
  flagId: FlagId
  before: boolean
  after: boolean
  sources: EffectSource[]
}

export interface BandTrace {
  phase: 'pasma'
  kind: 'pasmo'
  owner: ScaleOwner
  scaleKey: ScaleKey
  value: number
  before: BandRef | null
  after: BandRef | null
}

export interface VariantTrace {
  phase: 'varianty'
  kind: 'varianta'
  characterId: CharacterId
  blockId: BlockId
  /** `null` while undecided. */
  variationId: VariationId | null
  /** Up to and including the deciding variation. */
  evaluations: VariantEvaluation[]
}

export type TraceEntry =
  | RuleTrace
  | ExclusionTrace
  | OverriddenTrace
  | ConflictTrace
  | HouseholdMergeTrace
  | HouseholdSplitTrace
  | MembershipTrace
  | LeadershipTrace
  | ScaleSetTrace
  | ScaleShiftTrace
  | ClampTrace
  | FlagTrace
  | BandTrace
  | VariantTrace
