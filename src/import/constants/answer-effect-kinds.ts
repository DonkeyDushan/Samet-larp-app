import type { StructuralEffectKind } from '@/engine'

/**
 * Sheet effect names (`SNATEK(Mirek)`) to engine effect kinds. `ODCHOD` is
 * accepted by the sheet but has no engine meaning yet, so it is absent.
 */
export const ANSWER_EFFECT_KINDS: Readonly<Record<string, StructuralEffectKind>> = Object.freeze({
  SNATEK: 'domacnost_slouceni',
  ROZVOD: 'domacnost_rozdeleni',
  VEDENI: 'vedeni',
  CLENSTVI: 'clenstvi',
})
