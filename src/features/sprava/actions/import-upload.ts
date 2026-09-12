'use server'

import { revalidatePath } from 'next/cache'
import { persistConfig } from '@/import'
import { errors } from '@/locales/cs/errors'
import { errorMessage } from '@/utils/error-message'
import { SPRAVA_ROUTE } from '../constants/routes'
import { UPLOAD_FIELDS } from '../constants/upload-fields'
import type { UploadReport } from '../types/upload-report'
import { failedReport } from '../utils/failed-report'
import { inspectUpload } from '../utils/inspect-upload'
import { readFormField } from '../utils/read-form-field'

/** Checks and, when there is no error, writes a new config version. */
export const importUpload = async (formData: FormData): Promise<UploadReport> => {
  const author = readFormField(formData, UPLOAD_FIELDS.author).trim()
  if (author === '') return failedReport(errors.authorRequiredForImport)

  const inspected = await inspectUpload(formData)
  if (inspected._type === 'failed' || !inspected.report.ok) return inspected.report

  const { upload, report } = inspected

  try {
    const persisted = await persistConfig({
      runId: readFormField(formData, UPLOAD_FIELDS.runId),
      config: upload.imported.config,
      issues: upload.imported.issues,
      sourceFilename: upload.filename,
      author,
      note: readFormField(formData, UPLOAD_FIELDS.note) || undefined,
    })
    revalidatePath(SPRAVA_ROUTE)

    return { ...report, version: persisted.version, alreadyImported: persisted.alreadyImported, diff: persisted.diff }
  } catch (cause) {
    return { ...report, ok: false, failure: errorMessage(cause) }
  }
}
