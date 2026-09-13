/**
 * Phase 1: every effect that fires this chapter — from chosen answer options
 * (layers 1 and 2) and from rules whose condition holds (layer 4). Both become
 * the same `EffectInstance`, so the later phases have one code path.
 */
import { ANSWER_EFFECT_PRIORITY } from '../constants/priorities'
import type { EvaluationContext } from '../evaluationContext'
import { evaluateInContext } from '../expression/evaluateInContext'
import type { EffectSource } from '../types/source'
import { compareIds } from '../utils/compareIds'
import { applicableRules } from './compileConditions'
import type { EffectInstance } from './effectInstance'
import { resolveEffect } from './resolveEffect'

const byId = (a: { id: string }, b: { id: string }): number => compareIds(a.id, b.id)

const collectAnswerEffects = (context: EvaluationContext, instances: EffectInstance[]): void => {
  const questions = [...context.catalog.questions.values()]
    .filter((question) => question.chapter === context.chapter)
    .sort(byId)

  for (const question of questions) {
    const answer = context.answers.byQuestion.get(question.id)
    if (!answer) continue

    for (const option of [...question.options].sort(byId)) {
      if (!context.answers.chosen.has(option.id)) continue

      const source: EffectSource = {
        kind: 'odpoved',
        characterId: question.characterId,
        questionId: question.id,
        optionId: option.id,
        filledByOrg: answer.filledByOrg,
      }
      const owner = {
        characterId: question.characterId,
        referencedCharacterId: option.referencedCharacterId,
        numericValue: answer.numericValue,
        subject: option.id,
      }
      for (const effect of option.effects) {
        instances.push({
          effect: resolveEffect(effect, owner),
          source,
          priority: ANSWER_EFFECT_PRIORITY,
          isExclusion: false,
          appliesOncePerHousehold: false,
        })
      }
    }
  }
}

/** Rule conditions read the state at the start of the chapter; nothing has changed it yet. */
const collectRuleEffects = (context: EvaluationContext, instances: EffectInstance[]): void => {
  for (const rule of applicableRules(context.catalog.config.rules, context.chapter).sort(byId)) {
    const condition = context.conditions.rules.get(rule.id)
    if (!condition) continue

    const characterIds = rule.characterId === undefined ? context.catalog.characterIds : [rule.characterId]
    for (const characterId of characterIds) {
      const outcome = evaluateInContext(context, condition, characterId, { ownerKind: 'pravidlo', ownerId: rule.id })
      if (outcome.result === 'neplati') continue

      context.trace.push({
        phase: 'sber',
        kind: 'pravidlo',
        ruleId: rule.id,
        characterId,
        result: outcome.result,
        readings: outcome.readings,
      })
      if (outcome.result === 'neznamo') continue

      const source: EffectSource = { kind: 'pravidlo', ruleId: rule.id, characterId }
      for (const effect of rule.effects) {
        instances.push({
          effect: resolveEffect(effect, { characterId, subject: rule.id }),
          source,
          priority: rule.priority,
          isExclusion: rule.isExclusion,
          appliesOncePerHousehold: rule.appliesOncePerHousehold,
        })
      }
    }
  }
}

export const collectEffects = (context: EvaluationContext): EffectInstance[] => {
  const instances: EffectInstance[] = []
  collectAnswerEffects(context, instances)
  collectRuleEffects(context, instances)

  return instances
}
