import type { Issue } from '@/import'

export const splitIssuesBySeverity = (issues: readonly Issue[]): { errors: Issue[]; warnings: Issue[] } => {
  const errors: Issue[] = []
  const warnings: Issue[] = []
  for (const issue of issues) {
    if (issue.severity === 'chyba') errors.push(issue)
    else warnings.push(issue)
  }

  return { errors, warnings }
}
