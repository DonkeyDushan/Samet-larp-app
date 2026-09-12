import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { useCallback } from 'react'
import { APP_LOCALE } from '@/locales/app-locale'
import { sprava } from '@/locales/cs/sprava'
import { INLINE_SEPARATOR } from '../../../../constants/report-format'
import type { VersionRow } from '../../../../types/version-row'
import { extractIssues } from '../../../../utils/extract-issues'
import { formatIssueLocation } from '../../../../utils/format-issue-location'
import { splitIssuesBySeverity } from '../../../../utils/split-issues'
import styles from './VersionItem.module.css'

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
    <li className={styles.item} data-testid={`version-item--${version.id}`} data-active={version.isActive}>
      <div className={styles.row}>
        <div>
          <Typography variant="subtitle2" component="div">
            {sprava.version(version.version)}
            {version.isActive && <Chip size="small" color="success" label={sprava.active} className={styles.chip} />}
          </Typography>
          <Typography variant="caption" component="p" className={styles.muted}>
            {meta.join(INLINE_SEPARATOR)}
          </Typography>
          <Typography variant="caption" component="p" className={styles.muted}>
            {sprava.issueSummary(warnings.length, errors.length)}
          </Typography>
        </div>

        <div className={styles.actions}>
          <Button variant="outlined" onClick={handleToggle} data-testid={`version-item--toggle--${version.id}`}>
            {isExpanded ? sprava.hideChecks : sprava.showChecks}
          </Button>
          {!version.isActive && (
            // Disabled MUI buttons ignore the pointer, so the tooltip sits on a wrapper.
            <span title={hasAuthor ? undefined : sprava.fillAuthorFirst}>
              <Button
                variant="contained"
                disabled={pending || !hasAuthor}
                onClick={handleActivate}
                data-testid={`version-item--activate--${version.id}`}
              >
                {sprava.activate(runId)}
              </Button>
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <ul className={styles.findings}>
          {issues.length === 0 && (
            <li>
              <Typography variant="caption" className={styles.muted}>
                {sprava.noFindings}
              </Typography>
            </li>
          )}
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>
              <Typography variant="caption">
                <code className={styles.muted}>{formatIssueLocation(issue.location)}</code> {issue.message}
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
