/**
 * Phase 3: households, marriages, membership and leadership. It completes
 * before any value changes, because a shared scale needs its members before
 * contributions are summed into it (§7.3).
 */
import type { EvaluationContext } from '../evaluationContext'
import { structuralSlots } from '../resolution/effectSlots'
import { recordResolution, resolveSlots } from '../resolution/resolveSlots'
import type { CharacterId, GroupId } from '../types/ids'
import type { EffectSource } from '../types/source'
import { compareIds } from '../utils/compareIds'
import { sourceKey } from '../utils/keys'
import { groupStateOf } from '../utils/stateAccess'
import { hasKind, isStructural, type EffectInstance } from './effectInstance'
import { mergeHouseholds, splitHousehold } from './householdChanges'

const changeMembership = (
  context: EvaluationContext,
  sources: EffectSource[],
  groupId: GroupId,
  characterId: CharacterId,
  action: 'pridat' | 'odebrat',
): void => {
  const group = groupStateOf(context.state, groupId)
  const before = group.memberIds.includes(characterId)

  if (action === 'pridat' && !before) group.memberIds = [...group.memberIds, characterId].sort(compareIds)
  if (action === 'odebrat') group.memberIds = group.memberIds.filter((memberId) => memberId !== characterId)

  context.trace.push({ phase: 'strukturalni', kind: 'clenstvi', groupId, characterId, action, before, after: action === 'pridat', sources })

  if (action === 'odebrat' && group.leaderId === characterId) {
    delete group.leaderId
    context.trace.push({ phase: 'strukturalni', kind: 'vedeni', groupId, before: characterId, after: null, sources })
  }
}

const changeLeadership = (context: EvaluationContext, sources: EffectSource[], groupId: GroupId, characterId: CharacterId): void => {
  const group = groupStateOf(context.state, groupId)
  if (!group.memberIds.includes(characterId)) changeMembership(context, sources, groupId, characterId, 'pridat')

  const before = group.leaderId ?? null
  group.leaderId = characterId
  context.trace.push({ phase: 'strukturalni', kind: 'vedeni', groupId, before, after: characterId, sources })
}

/** Descending priority (§7.3), then source, so equal inputs apply in equal order. */
const byPriority = (a: EffectInstance[], b: EffectInstance[]): number => {
  const [first] = a
  const [second] = b
  if (!first || !second) return 0

  return second.priority - first.priority || compareIds(sourceKey(first.source), sourceKey(second.source))
}

export const applyStructural = (context: EvaluationContext, instances: EffectInstance[]): void => {
  const resolution = resolveSlots(instances.filter(isStructural), (instance) => structuralSlots(instance.effect))
  recordResolution(context, 'strukturalni', resolution)

  for (const group of [...resolution.accepted].sort(byPriority)) {
    const sources = group.map((instance) => instance.source)
    const marriages = group.filter(hasKind('domacnost_slouceni'))
    const divorces = group.filter(hasKind('domacnost_rozdeleni'))
    const memberships = group.filter(hasKind('clenstvi'))
    const leaderships = group.filter(hasKind('vedeni'))

    // A group holds identical claims, so it is all one kind and its first effect stands for all.
    const [marriage] = marriages
    const [divorce] = divorces
    const [membership] = memberships
    const [leadership] = leaderships
    if (marriage) mergeHouseholds(context, marriages, marriage.effect)
    if (divorce) splitHousehold(context, divorces, divorce.effect)
    if (membership) changeMembership(context, sources, membership.effect.groupId, membership.effect.characterId, membership.effect.action)
    if (leadership) changeLeadership(context, sources, leadership.effect.groupId, leadership.effect.characterId)
  }
}
