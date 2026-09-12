'use server'

import type { UploadReport } from '../types/upload-report'
import { inspectUpload } from '../utils/inspect-upload'

/**
 * The dry run the author uses to fix twenty typos in one round (§10.2). A broken
 * sheet can never reach the database this way — it only produces a list.
 */
export const checkUpload = async (formData: FormData): Promise<UploadReport> => (await inspectUpload(formData)).report
