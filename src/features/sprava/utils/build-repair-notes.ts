import type { ImportRepairs } from '@/import'
import { COUNTED_REPAIR_KINDS } from '../constants/repair-kinds'
import type { RepairNote } from '../types/repair-note'

export const buildRepairNotes = (repairs: ImportRepairs, ignoredSheets: string[]): RepairNote[] => {
  const notes: RepairNote[] = []
  for (const kind of COUNTED_REPAIR_KINDS) {
    if (repairs[kind] > 0) notes.push({ _type: kind, count: repairs[kind] })
  }
  if (ignoredSheets.length > 0) notes.push({ _type: 'ignoredSheets', sheets: ignoredSheets })

  return notes
}
