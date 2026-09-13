/** Phase 2: exclusions always win over assignment, whatever the priorities (§7.3). */
import type { EvaluationContext } from '../evaluationContext'
import { exclusionKey } from '../resolution/effectSlots'
import type { EffectSource } from '../types/source'
import type { EffectInstance } from './effectInstance'

/** Returns the effects that survive; exclusions themselves are consumed here. */
export const applyExclusions = (context: EvaluationContext, instances: EffectInstance[]): EffectInstance[] => {
  const exclusions = new Map<string, EffectSource[]>()
  for (const instance of instances) {
    if (!instance.isExclusion) continue
    const key = exclusionKey(instance.effect)
    exclusions.set(key, [...(exclusions.get(key) ?? []), instance.source])
  }

  const remaining: EffectInstance[] = []
  for (const instance of instances) {
    if (instance.isExclusion) continue

    const excludedBy = exclusions.get(exclusionKey(instance.effect))
    if (!excludedBy) {
      remaining.push(instance)
      continue
    }
    context.trace.push({ phase: 'vylouceni', kind: 'vylouceni', effect: instance.effect, source: instance.source, excludedBy })
  }

  return remaining
}
