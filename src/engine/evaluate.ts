/**
 * `evaluate(state, answers, config) → { state, trace, conflicts }` — the rules
 * engine (§7). Pure: no database, no network, no clock, no randomness. The same
 * input gives byte-identical output, and the input is never modified.
 */
import { buildCatalog } from './catalog/buildCatalog'
import { fail } from './errors/engineInputError'
import type { EvaluationContext } from './evaluationContext'
import { applyAbsoluteSettings } from './phases/applyAbsoluteSettings'
import { applyExclusions } from './phases/applyExclusions'
import { applyFlags } from './phases/applyFlags'
import { applyShifts } from './phases/applyShifts'
import { applyStructural } from './phases/applyStructural'
import { assignBands } from './phases/assignBands'
import { collectEffects } from './phases/collectEffects'
import { compileConditions } from './phases/compileConditions'
import { indexAnswers } from './phases/indexAnswers'
import { indexRolls } from './phases/indexRolls'
import { reportLeftovers } from './phases/reportLeftovers'
import { selectVariants } from './phases/selectVariants'
import { validateState } from './phases/validateState'
import type { EngineConfig } from './types/config'
import type { EvaluationInputs } from './types/input'
import type { EvaluateResult } from './types/result'
import type { RunState } from './types/state'
import { compareIds } from './utils/compareIds'
import { normalizeState } from './utils/normalizeState'

export const evaluate = (state: RunState, inputs: EvaluationInputs, config: EngineConfig): EvaluateResult => {
  if (state.completedChapter !== inputs.chapter - 1) {
    fail('nesouhlasi_kapitola', String(inputs.chapter), `the state is after chapter ${state.completedChapter}`)
  }

  const catalog = buildCatalog(config)
  validateState(state, catalog)

  const context: EvaluationContext = {
    chapter: inputs.chapter,
    catalog,
    answers: indexAnswers(inputs.answers, catalog, inputs.chapter),
    rolls: indexRolls(inputs.rolls),
    conditions: compileConditions(catalog, inputs.chapter),
    start: state,
    state: structuredClone(state),
    trace: [],
    conflicts: [],
    missingRolls: new Map(),
    pending: new Map(),
  }

  const instances = applyExclusions(context, collectEffects(context))
  // The structural phase completes before any value: shared scales need their members first (§7.3).
  applyStructural(context, instances)
  applyAbsoluteSettings(context, instances)
  applyShifts(context, instances)
  applyFlags(context, instances)
  assignBands(context)
  reportLeftovers(context)
  const variants = selectVariants(context)

  return {
    state: normalizeState({ ...context.state, completedChapter: inputs.chapter }),
    trace: context.trace,
    conflicts: context.conflicts,
    missingRolls: [...context.missingRolls.entries()].sort(([a], [b]) => compareIds(a, b)).map(([, request]) => request),
    variants,
  }
}
