'use server'

import { revalidatePath } from 'next/cache'
import { runPath } from '@/core'
import { readAuthor } from '@/core/services/auth-cookies'
import { persistConfig } from '@/import'
import { errors } from '@/locales/cs/errors'
import { errorMessage } from '@/utils/error-message'
import { readFormField } from '@/utils/read-form-field'
import { UPLOAD_FIELDS } from '../constants/upload-fields'
import type { UploadReport } from '../types/upload-report'
import { failedReport } from '../utils/failed-report'
import { inspectUpload } from '../utils/inspect-upload'

/** Checks and, when there is no error, makes the upload the run's config. */
export const importUpload = async (formData: FormData): Promise<UploadReport> => {
  const author = await readAuthor()
  if (author === '') return failedReport(errors.authorRequiredForImport)

  const inspected = await inspectUpload(formData)
  if (inspected._type === 'failed' || !inspected.report.ok) return inspected.report

  const { upload, report } = inspected
  const runId = readFormField(formData, UPLOAD_FIELDS.runId)

  try {
    const persisted = await persistConfig({
      runId,
      config: upload.imported.config,
      issues: upload.imported.issues,
      configFile: upload.configFile,
      templateFiles: upload.templateFiles,
      author,
      note: readFormField(formData, UPLOAD_FIELDS.note) || undefined,
      reason: readFormField(formData, UPLOAD_FIELDS.reason) || undefined,
    })
    // The whole run layout: the character panel and chapter states may have changed too.
    revalidatePath(runPath(runId), 'layout')

    return { ...report, saved: true, removedCount: persisted.removedCount, touchedChapters: persisted.touchedChapters }
  } catch (cause) {
    return { ...report, ok: false, failure: errorMessage(cause) }
  }
}
