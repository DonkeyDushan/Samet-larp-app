/**
 * Phase 4, second step: scale shifts. Every contribution to one value is summed
 * first and clamped once at the end, so the order of contributions cannot change
 * the result (§7.2, §4.1).
 */
import { scaleOf } from '../catalog/scaleOf'
import { fail } from '../errors/engineInputError'
import type { EvaluationContext } from '../evaluationContext'
import type { ScaleDefinition } from '../types/scale'
import type { ScaleOwner } from '../types/source'
import type { ScaleContribution } from '../types/trace'
import { compareIds } from '../utils/compareIds'
import { joinKey, ownerKey, sourceKey } from '../utils/keys'
import { clampToScale } from '../utils/scaleMath'
import { ownerOf, readScale, writeScale } from '../utils/stateAccess'
import { hasKind, type EffectInstance, type EffectOfKind } from './effectInstance'

interface Target {
  owner: ScaleOwner
  scale: ScaleDefinition
  shifts: EffectInstance<EffectOfKind<'zmena_skaly'>>[]
}

const contributionsOf = (target: Target): { contributions: ScaleContribution[]; total: number } => {
  const ordered = [...target.shifts].sort((a, b) => compareIds(sourceKey(a.source), sourceKey(b.source)))
  const countedOnce = new Set<string>()
  const contributions: ScaleContribution[] = []
  let total = 0

  for (const shift of ordered) {
    const contribution: ScaleContribution = { source: shift.source, delta: shift.effect.delta, weight: shift.effect.weight }

    // Without the flag, members' contributions to a shared value add up (§4.4).
    if (shift.appliesOncePerHousehold && target.owner.kind === 'domacnost' && shift.source.kind === 'pravidlo') {
      const onceKey = joinKey(shift.source.ruleId, target.owner.householdId)
      if (countedOnce.has(onceKey)) {
        contributions.push({ ...contribution, ignored: 'jednou_za_domacnost' })
        continue
      }
      countedOnce.add(onceKey)
    }

    total += shift.effect.delta
    contributions.push(contribution)
  }

  return { contributions, total }
}

const applyTarget = (context: EvaluationContext, target: Target): void => {
  const { owner, scale } = target
  const { contributions, total } = contributionsOf(target)
  const before = readScale(context.state, owner, scale.key)

  if (before === undefined) {
    if (owner.kind === 'postava') {
      fail('chybi_hodnota', joinKey(owner.characterId, scale.key), 'the character has no value for this scale')
    }
    // A shared value left open by a merge stays open; the leftover check reports it.
    context.trace.push({ phase: 'hodnotove', kind: 'zmena_skaly', owner, scaleKey: scale.key, before: null, raw: null, after: null, contributions })

    return
  }

  const raw = before + total
  const clamped = clampToScale(scale, raw)
  writeScale(context.state, owner, scale.key, clamped.value)

  context.trace.push({ phase: 'hodnotove', kind: 'zmena_skaly', owner, scaleKey: scale.key, before, raw, after: clamped.value, contributions })
  if (clamped.bound) {
    context.trace.push({ phase: 'hodnotove', kind: 'orez', owner, scaleKey: scale.key, raw, after: clamped.value, bound: clamped.bound })
  }
}

export const applyShifts = (context: EvaluationContext, instances: EffectInstance[]): void => {
  const targets = new Map<string, Target>()

  for (const shift of instances.filter(hasKind('zmena_skaly'))) {
    const scale = scaleOf(context.catalog, shift.effect.scaleKey)
    const owner = ownerOf(context.state, scale, shift.effect.characterId)
    const key = joinKey(ownerKey(owner), scale.key)
    const target = targets.get(key) ?? { owner, scale, shifts: [] }
    target.shifts.push(shift)
    targets.set(key, target)
  }

  for (const [, target] of [...targets.entries()].sort(([a], [b]) => compareIds(a, b))) applyTarget(context, target)
}
