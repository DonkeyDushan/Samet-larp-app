import type { Sourced } from './sourced'

export interface ParsedBand {
  ordinal: number
  min: number
  max: number
  name: string
}

export interface ParsedScale extends Sourced {
  key: string
  label: string
  scope: 'postava' | 'domacnost'
  min: number
  max: number
  bands: ParsedBand[]
  mergeStrategy?: string
  splitStrategy?: string
}
