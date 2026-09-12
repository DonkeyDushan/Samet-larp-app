import type { ConfigDiff } from '@/import'
import { importReport } from '@/locales/cs/import_report'
import { DiffGroup } from './components/DiffGroup/DiffGroup'

/** What the import changes against the newest stored version (§10.2). */
export const DiffView = ({ diff }: { diff: ConfigDiff }) => {
  if (diff.identical) {
    return (
      <p className="rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800" data-testid="diff-view--identical">
        {importReport.diffIdentical}
      </p>
    )
  }

  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800" data-testid="diff-view">
      <div className="border-b border-inherit px-3 py-2">
        <h3 className="font-semibold">{importReport.diffTitle}</h3>
        <p className="text-xs text-neutral-500">
          {importReport.diffCounts(diff.counts.added, diff.counts.changed, diff.counts.removed)}
        </p>
      </div>
      <div className="max-h-80 overflow-y-auto p-3 text-xs">
        {diff.added.length > 0 && <DiffGroup title={importReport.diffAdded} entries={diff.added} testId="diff-group--added" />}
        {diff.changed.length > 0 && (
          <DiffGroup title={importReport.diffChanged} entries={diff.changed} testId="diff-group--changed" />
        )}
        {diff.removed.length > 0 && (
          <DiffGroup title={importReport.diffRemoved} entries={diff.removed} testId="diff-group--removed" />
        )}
      </div>
    </div>
  )
}
