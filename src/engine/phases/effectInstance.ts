import { STRUCTURAL_EFFECT_KINDS } from '../constants/effectPhases'
import type { ResolvedEffect } from '../types/effect'
import type { EffectSource } from '../types/source'

/** One effect that fired, with where it came from. */
export interface EffectInstance<E extends ResolvedEffect = ResolvedEffect> {
  effect: E
  source: EffectSource
  priority: number
  isExclusion: boolean
  appliesOncePerHousehold: boolean
}

export type EffectOfKind<K extends ResolvedEffect['kind']> = Extract<ResolvedEffect, { kind: K }>

export const hasKind =
  <K extends ResolvedEffect['kind']>(kind: K) =>
  (instance: EffectInstance): instance is EffectInstance<EffectOfKind<K>> =>
    instance.effect.kind === kind

export const isStructural = (instance: EffectInstance): boolean =>
  (STRUCTURAL_EFFECT_KINDS as readonly string[]).includes(instance.effect.kind)
