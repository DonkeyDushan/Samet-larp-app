/** Scale and band definitions (§4.1, §4.4). */
import type { ScaleKey } from './ids'

/** Thresholds and names always come from data, never from code (§4.1). */
export interface BandDefinition {
  ordinal: number
  /** Inclusive bounds. */
  min: number
  max: number
  name: string
}

export type MergeStrategy = 'soucet' | 'prumer' | 'vyssi' | 'otazka'

export type SplitStrategy = 'kopie' | 'polovina' | 'otazka'

export interface ScaleDefinition {
  key: ScaleKey
  /**
   * Who owns the value (§4.4). `domacnost` means the household holds it and all
   * members read and change the same one — it is never copied.
   */
  scope: 'postava' | 'domacnost'
  min: number
  max: number
  /** Need not cover the whole range; a value in a gap has no band. */
  bands: BandDefinition[]
  /** Household scales only. `otazka` means do not compute: an answer sets the value. */
  mergeStrategy?: MergeStrategy
  splitStrategy?: SplitStrategy
}
