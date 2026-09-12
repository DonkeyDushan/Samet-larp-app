/**
 * Config import (§10.2): from an uploaded file to a checked `ParsedConfig`.
 *
 * Parsing and validating never touch the database and never throw, so the whole
 * path is testable on fixtures. Writing to the database is a separate step that
 * runs only when there is no error.
 */
import { IssueCollector } from './issue-collector'
import { parseConfig, unknownSheets } from './parse/parse-config'
import { toParsedTemplate } from './template'
import type { ImportResult } from './types/import-result'
import type { Workbook } from './types/parsed-config'
import type { UploadedTemplate } from './types/parsed-template'
import { validateConfig } from './validate/validate-config'
import { readWorkbook } from './workbook'

/** Parses and validates a workbook that is already in memory. */
export const importWorkbook = (workbook: Workbook, uploadedTemplates: UploadedTemplate[] = []): ImportResult => {
  const issues = new IssueCollector()
  const config = parseConfig(workbook, issues)
  const templates = uploadedTemplates.map(toParsedTemplate)

  validateConfig({ config, templates: uploadedTemplates.length > 0 ? templates : undefined }, issues)

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

/** One `.xlsx` with every sheet — the only accepted format. */
export const importXlsx = (data: ArrayBuffer | Uint8Array, templates: UploadedTemplate[] = []): ImportResult =>
  importWorkbook(readWorkbook(data), templates)
