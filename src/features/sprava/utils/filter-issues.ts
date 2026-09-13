import type { Issue, IssueCode } from '@/import'
import { APP_LOCALE } from '@/locales/app-locale'
import { ISSUE_FILTER_ALL } from '../constants/issue-filter'
import type { IssueFacet, IssueFilterValues } from '../types/issue-filter'
import { formatIssueLocation } from './format-issue-location'

/** The author searches by what they see in the sheet: an ID, a cell, a word from the message. */
const searchableText = (issue: Issue): string =>
  [formatIssueLocation(issue.location), issue.message, issue.value ?? '', issue.suggestion ?? '']
    .join('\n')
    .toLocaleLowerCase(APP_LOCALE)

export const filterIssues = (issues: readonly Issue[], { query, sheet, code }: IssueFilterValues): Issue[] => {
  const needle = query.trim().toLocaleLowerCase(APP_LOCALE)

  const result: Issue[] = []
  for (const issue of issues) {
    if (sheet !== ISSUE_FILTER_ALL && issue.location.sheet !== sheet) continue
    if (code !== ISSUE_FILTER_ALL && issue.code !== code) continue
    if (needle !== '' && !searchableText(issue).includes(needle)) continue
    result.push(issue)
  }

  return result
}

const countBy = <TValue extends string>(issues: readonly Issue[], key: (issue: Issue) => TValue): IssueFacet<TValue>[] => {
  const counts = new Map<TValue, number>()
  for (const issue of issues) counts.set(key(issue), (counts.get(key(issue)) ?? 0) + 1)

  return Array.from(counts, ([value, count]) => ({ value, count }))
}

/** Sheets in workbook order; kinds by frequency, so the recurring mistakes come first. */
export const issueFacets = (issues: readonly Issue[]) => ({
  sheets: countBy(issues, (issue) => issue.location.sheet),
  codes: countBy<IssueCode>(issues, (issue) => issue.code).sort((a, b) => b.count - a.count),
})
