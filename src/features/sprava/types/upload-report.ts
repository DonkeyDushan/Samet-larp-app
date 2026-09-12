import type { ConfigDiff, ImportRepairs, Issue, TemplateCoverage } from '@/import'

export interface UploadCounts {
  characters: number
  questions: number
  answers: number
  blocks: number
  variations: number
}

export interface UploadReport {
  ok: boolean
  filename: string
  /** Present even when the config was refused — that is the point. */
  issues: Issue[]
  errorCount: number
  warningCount: number
  repairs?: ImportRepairs
  chapters?: number[]
  counts?: UploadCounts
  diff?: ConfigDiff
  coverage?: TemplateCoverage
  ignoredSheets?: string[]
  /** Set when the config was written. */
  version?: number
  alreadyImported?: boolean
  /** Set when something went wrong outside validation. */
  failure?: string
}
