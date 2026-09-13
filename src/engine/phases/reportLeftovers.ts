/**
 * Phase 6: what is still unsettled at the end. A shared value a merge or split
 * left to an answer, with no answer setting it, is never filled in silently (§4.4).
 */
import { addConflict, type EvaluationContext } from '../evaluationContext'
import { compareIds } from '../utils/compareIds'

export const reportLeftovers = (context: EvaluationContext): void => {
  for (const [, pending] of [...context.pending.entries()].sort(([a], [b]) => compareIds(a, b))) {
    const household = context.state.households[pending.householdId]
    if (!household) continue

    addConflict(context, 'konflikty', {
      kind: 'nedopocitano',
      owner: { kind: 'domacnost', householdId: household.householdId, memberIds: [...household.memberIds] },
      scaleKey: pending.scaleKey,
      reason: pending.reason,
    })
  }
}
