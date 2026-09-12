import Typography from '@mui/material/Typography'
import { importReport } from '@/locales/cs/import_report'
import type { RepairNote } from '../../../../../../types/repair-note'
import { repairNoteText } from '../../../../../../utils/repair-note-text'
import styles from './Repairs.module.css'

/** What was quietly cleaned up while reading (§10.2). */
export const Repairs = ({ notes }: { notes: RepairNote[] }) => (
  <div className={styles.repairs} data-testid="upload-report--repairs">
    <Typography variant="caption" component="p" className={styles.title}>
      {importReport.repairsTitle}
    </Typography>
    <ul className={styles.list}>
      {notes.map((note) => (
        <li key={note._type}>
          <Typography variant="caption">{repairNoteText(note)}</Typography>
        </li>
      ))}
    </ul>
  </div>
)
