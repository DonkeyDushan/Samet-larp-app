/**
 * Config import (§10.2): from an uploaded file to a checked `ParsedConfig`.
 *
 * Parsing and validating never touch the database and never throw, so the whole
 * path is testable on fixtures. Writing to the database is a separate step that
 * runs only when there is no error.
 */
import { IssueCollector, type Issue } from './issues'
import { parseConfig, unknownSheets, type Workbook } from './parse-config'
import { parseTemplate, templateIdFromFilename } from './template'
import { validateConfig } from './validate'
import { readWorkbook, workbookFromCsvFiles } from './workbook'
import type { ParsedConfig, ParsedTemplate } from './types'

export interface ImportResult {
  config: ParsedConfig
  templates: ParsedTemplate[]
  issues: Issue[]
  errors: Issue[]
  warnings: Issue[]
  /** False when any error was found: the config must not be used (§10.2). */
  usable: boolean
  /** Sheets the import did not recognise, worth mentioning rather than failing on. */
  ignoredSheets: string[]
}

export interface UploadedTemplate {
  filename: string
  markdown: string
}

/** Parses and validates a workbook that is already in memory. */
export function importWorkbook(
  workbook: Workbook,
  uploadedTemplates: UploadedTemplate[] = [],
): ImportResult {
  const issues = new IssueCollector()
  const config = parseConfig(workbook, issues)
  const templates = uploadedTemplates.map(toParsedTemplate)

  validateConfig(
    { config, templates: uploadedTemplates.length > 0 ? templates : undefined },
    issues,
  )

  return {
    config,
    templates,
    issues: [...issues.all],
    errors: [...issues.errors],
    warnings: [...issues.warnings],
    usable: !issues.hasErrors,
    ignoredSheets: unknownSheets(workbook),
  }
}

/** The primary path: one `.xlsx` with every sheet. */
export function importXlsx(
  data: ArrayBuffer | Uint8Array,
  templates: UploadedTemplate[] = [],
): ImportResult {
  return importWorkbook(readWorkbook(data), templates)
}

/** The fallback path: one `.csv` per sheet. */
export function importCsvFiles(
  files: { filename: string; text: string }[],
  templates: UploadedTemplate[] = [],
): ImportResult {
  return importWorkbook(workbookFromCsvFiles(files), templates)
}

function toParsedTemplate({ filename, markdown }: UploadedTemplate): ParsedTemplate {
  const parsed = parseTemplate(markdown)
  return {
    externalId: templateIdFromFilename(filename),
    filename,
    markdown,
    blockIds: parsed.blockIds,
    variables: parsed.variables,
    problems: parsed.problems,
  }
}

export * from './issues'
export * from './types'
export { parseScaleImpact, splitScaleId, accountCounterpart } from './scale-impact'
export { parseCondition, DEFAULT_CONDITION } from './expression'
export { parseTemplate, templateIdFromFilename, KNOWN_VARIABLES } from './template'
export { readWorkbook, workbookFromCsvFiles, sheetNameFromFilename } from './workbook'
export { parseConfig, unknownSheets, type Workbook } from './parse-config'
export { validateConfig } from './validate'
