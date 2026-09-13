/** Phase 4, third step: flags. Setting and clearing the same flag is a contradiction the priority decides. */
import type { EvaluationContext } from '../evaluationContext'
import { recordResolution, resolveSlots } from '../resolution/resolveSlots'
import { joinKey } from '../utils/keys'
import { characterStateOf } from '../utils/stateAccess'
import { hasKind, type EffectInstance } from './effectInstance'

export const applyFlags = (context: EvaluationContext, instances: EffectInstance[]): void => {
  const flags = instances.filter(hasKind('priznak'))

  const resolution = resolveSlots(flags, ({ effect }) => [
    {
      key: joinKey('priznak', effect.characterId, effect.flagId),
      subject: { kind: 'priznak', characterId: effect.characterId, flagId: effect.flagId },
      proposal: String(effect.value),
    },
  ])
  recordResolution(context, 'hodnotove', resolution)

  for (const group of resolution.accepted) {
    const [first] = group
    if (!first) continue

    const { effect } = first
    const character = characterStateOf(context.state, effect.characterId)
    const before = character.flags[effect.flagId] === true
    character.flags[effect.flagId] = effect.value

    context.trace.push({
      phase: 'hodnotove',
      kind: 'priznak',
      characterId: effect.characterId,
      flagId: effect.flagId,
      before,
      after: effect.value,
      sources: group.map((instance) => instance.source),
    })
  }
}
