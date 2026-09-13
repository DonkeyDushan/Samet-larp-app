/**
 * Priority resolution (§7.3). Per slot the highest priority wins; different
 * proposals at that priority are a conflict and none of them is applied. The
 * result does not depend on the order effects arrive in.
 */
import { addConflict, type EvaluationContext } from '../evaluationContext'
import type { EffectInstance } from '../phases/effectInstance'
import type { Conflict, ConflictCandidate, ConflictSubject } from '../types/conflict'
import type { ResolvedEffect } from '../types/effect'
import { compareIds } from '../utils/compareIds'
import { joinKey } from '../utils/keys'
import type { Slot } from './effectSlots'

export interface Overridden<E extends ResolvedEffect> {
  instance: EffectInstance<E>
  subject: ConflictSubject
  winners: EffectInstance<E>[]
  winnerPriority: number
}

export interface SlotResolution<E extends ResolvedEffect> {
  /** Instances with identical claims are grouped and applied once, with all their sources. */
  accepted: EffectInstance<E>[][]
  overridden: Overridden<E>[]
  conflicts: Conflict[]
}

interface Claim<E extends ResolvedEffect> {
  subject: ConflictSubject
  entries: { instance: EffectInstance<E>; proposal: string }[]
}

export const resolveSlots = <E extends ResolvedEffect>(
  instances: EffectInstance<E>[],
  slotsOf: (instance: EffectInstance<E>) => Slot[],
): SlotResolution<E> => {
  const claims = new Map<string, Claim<E>>()
  const signatures = new Map<EffectInstance<E>, string>()

  for (const instance of instances) {
    const slots = slotsOf(instance)
    signatures.set(instance, slots.map((slot) => joinKey(slot.key, slot.proposal)).join())
    for (const slot of slots) {
      const claim = claims.get(slot.key) ?? { subject: slot.subject, entries: [] }
      claim.entries.push({ instance, proposal: slot.proposal })
      claims.set(slot.key, claim)
    }
  }

  const rejected = new Set<EffectInstance<E>>()
  const overridden: Overridden<E>[] = []
  const conflicts: Conflict[] = []

  for (const [, claim] of [...claims.entries()].sort(([a], [b]) => compareIds(a, b))) {
    const top = Math.max(...claim.entries.map((entry) => entry.instance.priority))
    const leaders = claim.entries.filter((entry) => entry.instance.priority === top)
    const proposals = [...new Set(leaders.map((entry) => entry.proposal))]

    if (proposals.length > 1) {
      for (const entry of claim.entries) rejected.add(entry.instance)

      const candidates: ConflictCandidate[] = []
      for (const proposal of proposals) {
        const group = leaders.filter((entry) => entry.proposal === proposal).map((entry) => entry.instance)
        const [first] = group
        if (first) candidates.push({ effect: first.effect, sources: group.map((instance) => instance.source) })
      }
      conflicts.push({ kind: 'stejna_priorita', subject: claim.subject, priority: top, candidates })
      continue
    }

    const winners = leaders.map((entry) => entry.instance)
    for (const entry of claim.entries) {
      if (entry.proposal === proposals[0]) continue
      rejected.add(entry.instance)
      overridden.push({ instance: entry.instance, subject: claim.subject, winners, winnerPriority: top })
    }
  }

  const accepted = new Map<string, EffectInstance<E>[]>()
  for (const instance of instances) {
    if (rejected.has(instance)) continue
    const signature = signatures.get(instance) ?? ''
    accepted.set(signature, [...(accepted.get(signature) ?? []), instance])
  }

  return { accepted: [...accepted.values()], overridden, conflicts }
}

export const recordResolution = <E extends ResolvedEffect>(
  context: EvaluationContext,
  phase: 'strukturalni' | 'hodnotove',
  resolution: SlotResolution<E>,
): void => {
  for (const conflict of resolution.conflicts) addConflict(context, phase, conflict)

  for (const loss of resolution.overridden) {
    context.trace.push({
      phase,
      kind: 'prekonano',
      subject: loss.subject,
      effect: loss.instance.effect,
      source: loss.instance.source,
      priority: loss.instance.priority,
      winners: loss.winners.map((winner) => winner.source),
      winnerPriority: loss.winnerPriority,
    })
  }
}
