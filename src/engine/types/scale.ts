/** Scale, band and flag definitions (§4.1, §4.4). */
import type { BandId, FlagId, ScaleId } from './ids'

/** Thresholds and names always come from data, never from code (§4.1). */
export interface BandDefinition {
  id: BandId
  ordinal: number
  /** Inclusive bounds. */
  min: number
  max: number
  name: string
}

export interface ScaleDefinition {
  id: ScaleId
  key: string
  label: string
  min: number
  max: number
  /**
   * Who owns the value (§4.4). `domacnost` means the household holds it and
   * all members read and change the same one — it is never copied.
   */
  scope: 'postava' | 'domacnost'
  /**
   * Merge on marriage; household scales only. `otazka` means do NOT compute —
   * the value comes from an answer or from the org, which is how money works:
   * players decide themselves how much each partner contributed.
   */
  mergeStrategy?: 'soucet' | 'prumer' | 'vyssi' | 'otazka'
  /** Split on divorce or death; household scales only. */
  splitStrategy?: 'kopie' | 'polovina' | 'otazka'
  /** Ascending by `ordinal`. Need not cover the whole range. */
  bands: BandDefinition[]
}

export interface FlagDefinition {
  id: FlagId
  key: string
  label: string
}
