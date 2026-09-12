import { errors } from '@/locales/cs/errors'
import { errorMessage } from '@/utils/error-message'
import type { UploadReport } from '../types/upload-report'
import { describeUpload } from './describe-upload'
import { failedReport } from './failed-report'
import { parseUpload, type ParsedUpload } from './parse-upload'

export type InspectedUpload =
  | { _type: 'failed'; report: UploadReport }
  | { _type: 'inspected'; upload: ParsedUpload; report: UploadReport }

/** Parses and checks an upload without writing anything. */
export const inspectUpload = async (formData: FormData): Promise<InspectedUpload> => {
  try {
    const upload = await parseUpload(formData)
    if (!upload) return { _type: 'failed', report: failedReport(errors.noConfigFile) }

    return { _type: 'inspected', upload, report: describeUpload(upload) }
  } catch (cause) {
    // A broken file must never take the application down (§10.2).
    return { _type: 'failed', report: failedReport(errors.unreadableFile(errorMessage(cause))) }
  }
}
