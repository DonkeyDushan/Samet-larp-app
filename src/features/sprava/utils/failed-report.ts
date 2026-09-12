import type { UploadReport } from '../types/upload-report'

/** A report for a failure that happened before validation could run. */
export const failedReport = (failure: string): UploadReport => ({
  ok: false,
  filename: '',
  issues: [],
  errorCount: 0,
  warningCount: 0,
  failure,
})
