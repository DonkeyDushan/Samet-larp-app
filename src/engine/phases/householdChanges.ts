/**
 * Marriage and divorce (§4.4). Shared values follow the strategy in the scale
 * definition; `otazka` leaves them open for an answer, and nothing is ever
 * rounded or guessed. The trace keeps every original value.
 */
import { householdScaleKeys, scaleOf } from '../catalog/scaleOf'
import { HALF_SPLIT_DIVISOR } from '../constants/effectDefaults'
import { fail } from '../errors/engineInputError'
import { addConflict, pendingKey, type EvaluationContext } from '../evaluationContext'
import type { PendingReason } from '../types/conflict'
import type { HouseholdId, ScaleKey } from '../types/ids'
import type { MergeStrategy, SplitStrategy } from '../types/scale'
import type { ScaleOwner } from '../types/source'
import type { HouseholdState } from '../types/state'
import type { HouseholdScaleChange, HouseholdSnapshot } from '../types/trace'
import { compareIds } from '../utils/compareIds'
import { mergedHouseholdId, splitHouseholdId } from '../utils/householdIds'
import { clampToScale } from '../utils/scaleMath'
import { characterStateOf, householdOfCharacter } from '../utils/stateAccess'
import type { EffectInstance, EffectOfKind } from './effectInstance'

interface Combined {
  raw?: number
  pending?: PendingReason
}

const mergeValue = (strategy: MergeStrategy, values: (number | null)[]): Combined => {
  if (strategy === 'otazka') return { pending: 'otazka' }

  const known = values.filter((value): value is number => value !== null)
  if (known.length !== values.length) return { pending: 'chybi_hodnota' }

  const sum = known.reduce((total, value) => total + value, 0)
  switch (strategy) {
    case 'soucet':
      return { raw: sum }
    case 'vyssi':
      return { raw: Math.max(...known) }
    case 'prumer': {
      const average = sum / known.length

      return Number.isInteger(average) ? { raw: average } : { pending: 'necele_cislo' }
    }
  }
}

const splitValue = (strategy: SplitStrategy, value: number | null): Combined => {
  if (strategy === 'otazka') return { pending: 'otazka' }
  if (value === null) return { pending: 'chybi_hodnota' }
  if (strategy === 'kopie') return { raw: value }

  const half = value / HALF_SPLIT_DIVISOR

  return Number.isInteger(half) ? { raw: half } : { pending: 'necele_cislo' }
}

const snapshot = (household: HouseholdState): HouseholdSnapshot => ({
  householdId: household.householdId,
  memberIds: [...household.memberIds],
  scales: { ...household.scales },
})

const householdOwner = (household: HouseholdState): ScaleOwner => ({
  kind: 'domacnost',
  householdId: household.householdId,
  memberIds: [...household.memberIds],
})

const markPending = (context: EvaluationContext, householdId: HouseholdId, scaleKey: ScaleKey, reason: PendingReason): void => {
  context.pending.set(pendingKey(householdId, scaleKey), { householdId, scaleKey, reason })
}

export const mergeHouseholds = (
  context: EvaluationContext,
  group: EffectInstance<EffectOfKind<'domacnost_slouceni'>>[],
  effect: EffectOfKind<'domacnost_slouceni'>,
): void => {
  const sources = group.map((instance) => instance.source)
  const first = householdOfCharacter(context.state, effect.characterId)
  const second = householdOfCharacter(context.state, effect.partnerId)

  // Joining an existing shared household is not a marriage the spec describes; the org decides.
  if (first === second || first.memberIds.length > 1 || second.memberIds.length > 1) {
    addConflict(context, 'strukturalni', { kind: 'strukturalni', reason: 'uz_v_domacnosti', effect, sources })

    return
  }

  const memberIds = [...first.memberIds, ...second.memberIds].sort(compareIds)
  const merged: HouseholdState = {
    householdId: mergedHouseholdId(context.chapter, memberIds),
    memberIds,
    scales: {},
    bands: {},
  }

  const changes: HouseholdScaleChange[] = []
  const clamps: { scaleKey: ScaleKey; raw: number; value: number; bound: 'min' | 'max' }[] = []
  for (const scaleKey of householdScaleKeys(context.catalog)) {
    const scale = scaleOf(context.catalog, scaleKey)
    const strategy = scale.mergeStrategy ?? fail('neznamy_odkaz', scaleKey, 'household scale without a merge strategy')
    const inputs = [first, second].map((household) => ({
      householdId: household.householdId,
      value: household.scales[scaleKey] ?? null,
    }))
    const combined = mergeValue(strategy, inputs.map((input) => input.value))

    if (combined.raw === undefined) {
      const reason = combined.pending ?? 'chybi_hodnota'
      markPending(context, merged.householdId, scaleKey, reason)
      changes.push({ scaleKey, strategy, inputs, value: null, pending: reason })
      continue
    }

    const clamped = clampToScale(scale, combined.raw)
    merged.scales[scaleKey] = clamped.value
    changes.push({ scaleKey, strategy, inputs, value: clamped.value })
    if (clamped.bound) clamps.push({ scaleKey, raw: combined.raw, value: clamped.value, bound: clamped.bound })
  }

  const before = [snapshot(first), snapshot(second)]
  delete context.state.households[first.householdId]
  delete context.state.households[second.householdId]
  context.state.households[merged.householdId] = merged
  for (const memberId of memberIds) characterStateOf(context.state, memberId).householdId = merged.householdId

  context.trace.push({
    phase: 'strukturalni',
    kind: 'domacnost_slouceni',
    characterIds: [effect.characterId, effect.partnerId],
    sources,
    before,
    after: snapshot(merged),
    scales: changes,
  })
  for (const clamp of clamps) {
    context.trace.push({
      phase: 'strukturalni',
      kind: 'orez',
      owner: householdOwner(merged),
      scaleKey: clamp.scaleKey,
      raw: clamp.raw,
      after: clamp.value,
      bound: clamp.bound,
    })
  }
}

/** The character leaves for a household of one; the rest keep the household and its ID. */
export const splitHousehold = (
  context: EvaluationContext,
  group: EffectInstance<EffectOfKind<'domacnost_rozdeleni'>>[],
  effect: EffectOfKind<'domacnost_rozdeleni'>,
): void => {
  const sources = group.map((instance) => instance.source)
  const household = householdOfCharacter(context.state, effect.characterId)

  if (household.memberIds.length < 2) {
    addConflict(context, 'strukturalni', { kind: 'strukturalni', reason: 'neni_v_domacnosti', effect, sources })

    return
  }
  if (effect.partnerId !== undefined && !household.memberIds.includes(effect.partnerId)) {
    addConflict(context, 'strukturalni', { kind: 'strukturalni', reason: 'partner_jinde', effect, sources })

    return
  }

  const staying: HouseholdState = {
    householdId: household.householdId,
    memberIds: household.memberIds.filter((memberId) => memberId !== effect.characterId),
    scales: {},
    bands: {},
  }
  const leaving: HouseholdState = {
    householdId: splitHouseholdId(context.chapter, effect.characterId),
    memberIds: [effect.characterId],
    scales: {},
    bands: {},
  }

  const changes: HouseholdScaleChange[] = []
  for (const scaleKey of householdScaleKeys(context.catalog)) {
    const scale = scaleOf(context.catalog, scaleKey)
    const strategy = scale.splitStrategy ?? fail('neznamy_odkaz', scaleKey, 'household scale without a split strategy')
    const input = household.scales[scaleKey] ?? null
    const inputs = [{ householdId: household.householdId, value: input }]
    const combined = splitValue(strategy, input)

    for (const target of [staying, leaving]) {
      if (combined.raw === undefined) markPending(context, target.householdId, scaleKey, combined.pending ?? 'chybi_hodnota')
      else target.scales[scaleKey] = combined.raw
    }
    changes.push({ scaleKey, strategy, inputs, value: combined.raw ?? null, ...(combined.pending ? { pending: combined.pending } : {}) })
  }

  const before = snapshot(household)
  context.state.households[staying.householdId] = staying
  context.state.households[leaving.householdId] = leaving
  characterStateOf(context.state, effect.characterId).householdId = leaving.householdId

  context.trace.push({
    phase: 'strukturalni',
    kind: 'domacnost_rozdeleni',
    characterId: effect.characterId,
    sources,
    before,
    after: [snapshot(staying), snapshot(leaving)],
    scales: changes,
  })
}
