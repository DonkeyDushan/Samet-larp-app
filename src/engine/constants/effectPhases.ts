/**
 * Phase membership lives in data so an `evaluate` implementation cannot work
 * around it — the phase order is an invariant, not a detail (§7.3).
 */

/** Effects of the structural phase; must all be applied before any value effect. */
export const STRUCTURAL_EFFECT_KINDS = Object.freeze([
  'domacnost_slouceni',
  'domacnost_rozdeleni',
  'clenstvi',
  'vedeni',
] as const)

/** Effects of the value phase; absolute settings (`nastaveni_skaly`) go first. */
export const VALUE_EFFECT_KINDS = Object.freeze([
  'nastaveni_skaly',
  'zmena_skaly',
  'pasmo',
  'priznak',
  'blok',
  'tag',
] as const)

export type StructuralEffectKind = (typeof STRUCTURAL_EFFECT_KINDS)[number]
export type ValueEffectKind = (typeof VALUE_EFFECT_KINDS)[number]
