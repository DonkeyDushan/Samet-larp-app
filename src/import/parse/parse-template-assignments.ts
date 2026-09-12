import { TEMPLATE_COLUMNS, TEMPLATES_SHEET } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { ImportRepairs, ParsedConfig, Workbook } from '../types/parsed-config'
import { readConfigSheet, requireColumns } from './read-config-sheet'

export const parseTemplateAssignments = (
  workbook: Workbook,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedConfig['templateAssignments'] => {
  const read = readConfigSheet(workbook, TEMPLATES_SHEET, repairs)
  if (!read) return []
  if (!requireColumns(TEMPLATES_SHEET, read.headers, TEMPLATE_COLUMNS, issues)) return []

  const assignments: ParsedConfig['templateAssignments'] = []
  for (const row of read.rows) {
    if (row.get('Template ID') === '') continue
    assignments.push({
      externalId: row.get('Template ID'),
      characterRef: row.get('Character'),
      location: row.at('Template ID'),
    })
  }

  return assignments
}
