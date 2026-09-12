import { importReport } from '@/locales/cs/import_report'
import type { RepairNote } from '../../../../../../types/repair-note'
import { repairNoteText } from '../../../../../../utils/repair-note-text'

/** What was quietly cleaned up while reading (§10.2). */
export const Repairs = ({ notes }: { notes: RepairNote[] }) => (
  <div className="rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800" data-testid="upload-report--repairs">
    <p className="font-medium">{importReport.repairsTitle}</p>
    <ul className="mt-1 list-disc pl-4">
      {notes.map((note) => (
        <li key={note._type}>{repairNoteText(note)}</li>
      ))}
    </ul>
  </div>
)
