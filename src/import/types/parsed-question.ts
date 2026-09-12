import type { ScaleImpact } from '../scale-impact'
import type { Sourced } from './sourced'

/** One of `SNATEK(Mirek)`, `VEDENI(...)`, `CLENSTVI(...)` from the `Effects` column. */
export interface ParsedAnswerEffect {
  name: string
  argument: string
  raw: string
}

export interface ParsedAnswerOption extends Sourced {
  externalId: string
  label: string
  ordinal: number
  /** `Scale Impact`, already parsed (§4.2). */
  impacts: ScaleImpact[]
  /** `Blocks`: blocks this answer switches on (layer 2). */
  blocks: string[]
  /** `Flags`: flags this answer sets (layer 2). */
  flags: string[]
  /** `Effects`: structural effects (layer 2). */
  effects: ParsedAnswerEffect[]
  /** Character the option names, resolved from the ID suffix or from `SNATEK(…)`. */
  referencedCharacter?: string
  isOther: boolean
}

export interface ParsedQuestion extends Sourced {
  externalId: string
  chapter: number
  /** What the author typed in the `Character` column. */
  characterRef: string
  /** Registry ID it resolved to; undefined when nothing matched. */
  characterId?: string
  ordinal: number
  text: string
  type: 'bool' | 'single' | 'multi' | 'scale_direct' | 'text'
  source: 'hrac' | 'org'
  isPaired: boolean
  /** Target scale key for `scale_direct`, taken from the impact column. */
  scaleKey?: string
  options: ParsedAnswerOption[]
}
