import type { ImportRepairs, Issue, TemplateCoverage } from '@/import'

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
  coverage?: TemplateCoverage
  ignoredSheets?: string[]
  /** Set when the config was written. */
  saved?: boolean
  /** Rows the new sheet no longer carried. */
  removedCount?: number
  /** Chapters an emergency fix marked as touched (§6.5). */
  touchedChapters?: number[]
  /** Set when something went wrong outside validation. */
  failure?: string
}
