import type { CountedRepairKind } from '../constants/repair-kinds'

/** One line of the "what was cleaned up" summary; text is chosen at render time. */
export type RepairNote =
  | { _type: CountedRepairKind; count: number }
  | { _type: 'ignoredSheets'; sheets: string[] }
