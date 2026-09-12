import { useCallback } from 'react'
import { APP_LOCALE } from '@/locales/app-locale'
import { sprava } from '@/locales/cs/sprava'
import { INLINE_SEPARATOR } from '../../../../constants/report-format'
import type { VersionRow } from '../../../../types/version-row'
import { extractIssues } from '../../../../utils/extract-issues'
import { formatIssueLocation } from '../../../../utils/format-issue-location'
import { splitIssuesBySeverity } from '../../../../utils/split-issues'

interface VersionItemProps {
  runId: string
  version: VersionRow
  isExpanded: boolean
  hasAuthor: boolean
  pending: boolean
  onToggle: (versionId: string) => void
  onActivate: (versionId: string) => void
}

export const VersionItem = ({ runId, version, isExpanded, hasAuthor, pending, onToggle, onActivate }: VersionItemProps) => {
  const handleToggle = useCallback(() => onToggle(version.id), [onToggle, version.id])
  const handleActivate = useCallback(() => onActivate(version.id), [onActivate, version.id])

  const issues = extractIssues(version.importReport)
  const { errors, warnings } = splitIssuesBySeverity(issues)
  const meta = [version.sourceFilename, new Date(version.createdAt).toLocaleString(APP_LOCALE), version.createdBy]
  if (version.note) meta.push(version.note)

  return (
    <li className="p-3 text-sm" data-testid={`version-item--${version.id}`} data-active={version.isActive}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {sprava.version(version.version)}
            {version.isActive && (
              <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
                {sprava.active}
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-500">{meta.join(INLINE_SEPARATOR)}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{sprava.issueSummary(warnings.length, errors.length)}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
            data-testid={`version-item--toggle--${version.id}`}
          >
            {isExpanded ? sprava.hideChecks : sprava.showChecks}
          </button>
          {!version.isActive && (
            <button
              type="button"
              disabled={pending || !hasAuthor}
              onClick={handleActivate}
              className="rounded bg-neutral-800 px-2 py-1 text-xs text-white disabled:opacity-40 dark:bg-neutral-200 dark:text-neutral-900"
              title={hasAuthor ? undefined : sprava.fillAuthorFirst}
              data-testid={`version-item--activate--${version.id}`}
            >
              {sprava.activate(runId)}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <ul className="mt-3 space-y-1 border-t border-neutral-200 pt-2 text-xs dark:border-neutral-800">
          {issues.length === 0 && <li className="text-neutral-500">{sprava.noFindings}</li>}
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>
              <span className="font-mono text-neutral-500">{formatIssueLocation(issue.location)}</span> {issue.message}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
