import { importReport } from '@/locales/cs/import_report'
import type { RepairNote } from '../types/repair-note'

export const repairNoteText = (note: RepairNote): string => {
  if (note._type === 'ignoredSheets') return importReport.ignoredSheets(note.sheets)

  return importReport[note._type](note.count)
}
