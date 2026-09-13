/** Working data of one `evaluate` call. Created there and never shared, so the function stays pure. */
import type { Catalog } from './catalog/buildCatalog'
import type { AnswerIndex } from './phases/indexAnswers'
import type { CompiledCondition } from './types/condition'
import type { Conflict, PendingReason } from './types/conflict'
import type { ChapterNumber, HouseholdId, RuleId, ScaleKey, VariationId } from './types/ids'
import type { RollRequest } from './types/result'
import type { RunState } from './types/state'
import type { TracePhase, TraceEntry } from './types/trace'
import { joinKey } from './utils/keys'

export interface CompiledConditions {
  variations: Map<VariationId, CompiledCondition>
  rules: Map<RuleId, CompiledCondition>
}

/** A household value a merge or split left open; it must be set before the chapter ends. */
export interface PendingValue {
  householdId: HouseholdId
  scaleKey: ScaleKey
  reason: PendingReason
}

export interface EvaluationContext {
  chapter: ChapterNumber
  catalog: Catalog
  answers: AnswerIndex
  rolls: Map<string, number>
  conditions: CompiledConditions
  /** The caller's state, untouched. */
  start: RunState
  /** A deep copy the phases change. */
  state: RunState
  trace: TraceEntry[]
  conflicts: Conflict[]
  missingRolls: Map<string, RollRequest>
  pending: Map<string, PendingValue>
}

export const pendingKey = (householdId: HouseholdId, scaleKey: ScaleKey): string => joinKey(householdId, scaleKey)

export const addConflict = (context: EvaluationContext, phase: TracePhase, conflict: Conflict): void => {
  context.conflicts.push(conflict)
  context.trace.push({ phase, kind: 'konflikt', conflictIndex: context.conflicts.length - 1 })
}
