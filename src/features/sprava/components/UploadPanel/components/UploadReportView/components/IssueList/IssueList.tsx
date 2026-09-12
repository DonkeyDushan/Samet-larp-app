import type { Issue, IssueSeverity } from '@/import'
import { importReport } from '@/locales/cs/import_report'
import { formatIssueLocation } from '../../../../../../utils/format-issue-location'

interface IssueListProps {
  title: string
  note: string
  issues: Issue[]
  severity: IssueSeverity
}

export const IssueList = ({ title, note, issues, severity }: IssueListProps) => (
  <div
    className="rounded border data-[severity=chyba]:border-red-300 data-[severity=varovani]:border-amber-300 dark:data-[severity=chyba]:border-red-900 dark:data-[severity=varovani]:border-amber-900"
    data-severity={severity}
    data-testid={`issue-list--${severity}`}
  >
    <div className="border-b border-inherit px-3 py-2">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs text-neutral-500">{note}</p>
    </div>
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`} className="px-3 py-2">
          <p className="font-mono text-xs text-neutral-500">{formatIssueLocation(issue.location)}</p>
          <p className="mt-0.5">{issue.message}</p>
          {issue.suggestion && (
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
              {importReport.didYouMeanBefore}
              <code className="font-medium">{issue.suggestion}</code>
              {importReport.didYouMeanAfter}
            </p>
          )}
        </li>
      ))}
    </ul>
  </div>
)
