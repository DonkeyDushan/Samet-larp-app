import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { ChangeEvent } from 'react'
import type { IssueCode } from '@/import'
import { importReport } from '@/locales/cs/import_report'
import { ISSUE_FILTER_ALL } from '../../../../../../constants/issue-filter'
import type { IssueFacet, IssueFilterValues } from '../../../../../../types/issue-filter'
import styles from './IssueFilter.module.css'

type FieldChangeHandler = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void

interface IssueFilterProps {
  values: IssueFilterValues
  sheets: IssueFacet<string>[]
  codes: IssueFacet<IssueCode>[]
  shown: number
  total: number
  onQuery: FieldChangeHandler
  onSheet: FieldChangeHandler
  onCode: FieldChangeHandler
}

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const

export const IssueFilter = ({ values, sheets, codes, shown, total, onQuery, onSheet, onCode }: IssueFilterProps) => (
  <div className={styles.filter} data-testid="issue-filter">
    <TextField
      type="search"
      label={importReport.filterQuery}
      placeholder={importReport.filterQueryPlaceholder}
      value={values.query}
      onChange={onQuery}
      className={styles.query}
      slotProps={{ htmlInput: { 'data-testid': 'issue-filter--query' } }}
    />
    <TextField
      select
      label={importReport.filterSheet}
      value={values.sheet}
      onChange={onSheet}
      slotProps={{ ...NATIVE_SELECT, htmlInput: { 'data-testid': 'issue-filter--sheet' } }}
    >
      <option value={ISSUE_FILTER_ALL}>{importReport.filterAll}</option>
      {sheets.map((facet) => (
        <option key={facet.value} value={facet.value}>
          {importReport.facetOption(facet.value, facet.count)}
        </option>
      ))}
    </TextField>
    <TextField
      select
      label={importReport.filterCode}
      value={values.code}
      onChange={onCode}
      slotProps={{ ...NATIVE_SELECT, htmlInput: { 'data-testid': 'issue-filter--code' } }}
    >
      <option value={ISSUE_FILTER_ALL}>{importReport.filterAll}</option>
      {codes.map((facet) => (
        <option key={facet.value} value={facet.value}>
          {importReport.facetOption(importReport.issueKinds[facet.value], facet.count)}
        </option>
      ))}
    </TextField>
    <Typography variant="caption" className={styles.count} data-testid="issue-filter--count">
      {importReport.filterShown(shown, total)}
    </Typography>
  </div>
)
