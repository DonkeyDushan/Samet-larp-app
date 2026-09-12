import { LISTED_STALE_ROWS_MAX } from '../constants/listed-stale-rows'

/** Source IDs for a message: the first few, plus how many there are in total. */
export interface LabelList {
  listed: string[]
  total: number
}

export const listLabels = (labels: readonly string[]): LabelList => ({
  listed: labels.slice(0, LISTED_STALE_ROWS_MAX),
  total: labels.length,
})
