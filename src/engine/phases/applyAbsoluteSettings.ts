/**
 * Phase 4, first step: absolute values from `scale_direct` answers, applied
 * before every shift — the org sets the starting point and the shifts land on
 * it (§6.7).
 */
import { scaleOf } from '../catalog/scaleOf'
import { pendingKey, type EvaluationContext } from '../evaluationContext'
import { recordResolution, resolveSlots } from '../resolution/resolveSlots'
import { joinKey, ownerKey } from '../utils/keys'
import { ownerOf, readScale, writeScale } from '../utils/stateAccess'
import { hasKind, type EffectInstance } from './effectInstance'

export const applyAbsoluteSettings = (context: EvaluationContext, instances: EffectInstance[]): void => {
  const settings = instances.filter(hasKind('nastaveni_skaly'))

  const resolution = resolveSlots(settings, ({ effect }) => {
    const owner = ownerOf(context.state, scaleOf(context.catalog, effect.scaleKey), effect.characterId)

    return [
      {
        key: joinKey('skala', ownerKey(owner), effect.scaleKey),
        subject: { kind: 'skala', owner, scaleKey: effect.scaleKey },
        proposal: String(effect.value),
      },
    ]
  })
  recordResolution(context, 'hodnotove', resolution)

  for (const group of resolution.accepted) {
    const [first] = group
    if (!first) continue

    const { effect } = first
    const owner = ownerOf(context.state, scaleOf(context.catalog, effect.scaleKey), effect.characterId)
    const before = readScale(context.state, owner, effect.scaleKey) ?? null

    writeScale(context.state, owner, effect.scaleKey, effect.value)
    if (owner.kind === 'domacnost') context.pending.delete(pendingKey(owner.householdId, effect.scaleKey))

    context.trace.push({
      phase: 'hodnotove',
      kind: 'nastaveni_skaly',
      owner,
      scaleKey: effect.scaleKey,
      before,
      after: effect.value,
      sources: group.map((instance) => instance.source),
    })
  }
}
