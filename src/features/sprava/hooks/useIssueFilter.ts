import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import type { Issue } from '@/import'
import { ISSUE_FILTER_ALL } from '../constants/issue-filter'
import { filterIssues, issueFacets } from '../utils/filter-issues'

type FieldChange = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>

/** Dozens of findings, browsed with the spreadsheet open next to them (§11). */
export const useIssueFilter = (issues: readonly Issue[]) => {
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState(ISSUE_FILTER_ALL)
  const [code, setCode] = useState(ISSUE_FILTER_ALL)

  const facets = useMemo(() => issueFacets(issues), [issues])

  const filtered = useMemo(() => filterIssues(issues, { query, sheet, code }), [issues, query, sheet, code])

  const handleQuery = useCallback((event: FieldChange) => setQuery(event.target.value), [])

  const handleSheet = useCallback((event: FieldChange) => setSheet(event.target.value), [])

  const handleCode = useCallback((event: FieldChange) => setCode(event.target.value), [])

  return { values: { query, sheet, code }, facets, filtered, handleQuery, handleSheet, handleCode }
}
