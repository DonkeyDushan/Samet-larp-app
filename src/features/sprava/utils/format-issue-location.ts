import type { IssueLocation } from '@/import'
import { importReport } from '@/locales/cs/import_report'
import { INLINE_SEPARATOR } from '../constants/report-format'

/** Sheet, row or cell, and column — the author has to find the row in the table. */
export const formatIssueLocation = ({ sheet, row, column, cell }: IssueLocation): string => {
  const parts = [sheet]
  if (cell) parts.push(cell)
  else if (row !== undefined) parts.push(importReport.row(row))
  if (column) parts.push(column)

  return parts.join(INLINE_SEPARATOR)
}
