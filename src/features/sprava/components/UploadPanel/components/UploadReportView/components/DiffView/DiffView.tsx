import Alert from '@mui/material/Alert'
import { TitledPanel } from '@/components'
import type { ConfigDiff } from '@/import'
import { importReport } from '@/locales/cs/import_report'
import { DiffGroup } from './components/DiffGroup/DiffGroup'
import styles from './DiffView.module.css'

/** What the import changes against the newest stored version (§10.2). */
export const DiffView = ({ diff }: { diff: ConfigDiff }) => {
  if (diff.identical) {
    return (
      <Alert severity="info" data-testid="diff-view--identical">
        {importReport.diffIdentical}
      </Alert>
    )
  }

  return (
    <TitledPanel
      title={importReport.diffTitle}
      note={importReport.diffCounts(diff.counts.added, diff.counts.changed, diff.counts.removed)}
      testId="diff-view"
    >
      <div className={styles.body}>
        {diff.added.length > 0 && <DiffGroup title={importReport.diffAdded} entries={diff.added} testId="diff-group--added" />}
        {diff.changed.length > 0 && (
          <DiffGroup title={importReport.diffChanged} entries={diff.changed} testId="diff-group--changed" />
        )}
        {diff.removed.length > 0 && (
          <DiffGroup title={importReport.diffRemoved} entries={diff.removed} testId="diff-group--removed" />
        )}
      </div>
    </TitledPanel>
  )
}
