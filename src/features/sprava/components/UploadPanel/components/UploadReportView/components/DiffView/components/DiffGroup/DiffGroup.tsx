import Typography from '@mui/material/Typography'
import type { DiffEntry } from '@/import'
import { common } from '@/locales/cs/common'
import { importReport } from '@/locales/cs/import_report'
import styles from './DiffGroup.module.css'

interface DiffGroupProps {
  title: string
  entries: DiffEntry[]
  testId: string
}

export const DiffGroup = ({ title, entries, testId }: DiffGroupProps) => (
  <div className={styles.group} data-testid={testId}>
    <Typography variant="caption" component="p" className={styles.title}>
      {importReport.diffGroupTitle(title, entries.length)}
    </Typography>
    <ul className={styles.entries}>
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.chapter ?? common.emptyValue}-${entry.id}`}>
          <Typography variant="caption">
            <span className={styles.kind}>
              {importReport.entityLabels[entry.kind]}
              {entry.chapter ? importReport.chapterSuffix(entry.chapter) : ''}:{' '}
            </span>
            <code>{entry.id}</code>
          </Typography>
          {entry.changes && (
            <ul className={styles.changes}>
              {entry.changes.map((change) => (
                <li key={change.field}>
                  <Typography variant="caption">
                    {change.field}: <s>{change.before || common.emptyValue}</s> → {change.after || common.emptyValue}
                  </Typography>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  </div>
)
