import type { Issue } from './issue'
import type { ParsedConfig } from './parsed-config'
import type { ParsedTemplate } from './parsed-template'

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
