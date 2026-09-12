import type { Issue } from '@/import'

/** Findings stored in `uploaded_files.import_report`. */
export const extractIssues = (report: unknown): Issue[] => {
  if (!report || typeof report !== 'object' || !('issues' in report)) return []

  const { issues } = report

  // Written by `persistConfig` from `Issue[]`; jsonb only loses the type.
  return Array.isArray(issues) ? (issues as Issue[]) : []
}
