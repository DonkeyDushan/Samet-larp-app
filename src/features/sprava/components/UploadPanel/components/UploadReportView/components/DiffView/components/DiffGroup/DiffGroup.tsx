import type { DiffEntry } from '@/import'
import { common } from '@/locales/cs/common'
import { importReport } from '@/locales/cs/import_report'

interface DiffGroupProps {
  title: string
  entries: DiffEntry[]
  testId: string
}

export const DiffGroup = ({ title, entries, testId }: DiffGroupProps) => (
  <div className="mb-3" data-testid={testId}>
    <p className="font-medium">{importReport.diffGroupTitle(title, entries.length)}</p>
    <ul className="mt-1 space-y-1">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.chapter ?? common.emptyValue}-${entry.id}`}>
          <span className="text-neutral-500">
            {importReport.entityLabels[entry.kind]}
            {entry.chapter ? importReport.chapterSuffix(entry.chapter) : ''}:{' '}
          </span>
          <code>{entry.id}</code>
          {entry.changes && (
            <ul className="ml-4 mt-0.5 space-y-0.5 text-neutral-600 dark:text-neutral-400">
              {entry.changes.map((change) => (
                <li key={change.field}>
                  {change.field}: <s>{change.before || common.emptyValue}</s> → {change.after || common.emptyValue}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  </div>
)
