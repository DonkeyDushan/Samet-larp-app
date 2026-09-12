import { importCsvFiles, importXlsx, readTemplateFiles, type ImportResult, type UploadedTemplate } from '@/import'
import { FILENAME_LIST_SEPARATOR, UPLOAD_FIELDS } from '../constants/upload-fields'
import { readFormFiles } from './read-form-field'

export interface ParsedUpload {
  filename: string
  imported: ImportResult
}

const uploadedTemplates = async (formData: FormData): Promise<UploadedTemplate[]> => {
  const files = readFormFiles(formData, UPLOAD_FIELDS.templates)
  if (files.length === 0) return []

  const raw = await Promise.all(files.map(async (file) => ({ filename: file.name, data: await file.arrayBuffer() })))
  const parsed = await readTemplateFiles(raw)

  return parsed.map((template) => ({ filename: template.filename, markdown: template.markdown }))
}

/** Reads the uploaded config: one `.xlsx`, or several `.csv` as a fallback. */
export const parseUpload = async (formData: FormData): Promise<ParsedUpload | undefined> => {
  const xlsx = formData.get(UPLOAD_FIELDS.config)
  if (xlsx instanceof File && xlsx.size > 0) {
    return {
      filename: xlsx.name,
      imported: importXlsx(await xlsx.arrayBuffer(), await uploadedTemplates(formData)),
    }
  }

  const csvFiles = readFormFiles(formData, UPLOAD_FIELDS.configCsv)
  if (csvFiles.length === 0) return undefined

  const files = await Promise.all(csvFiles.map(async (file) => ({ filename: file.name, text: await file.text() })))

  return {
    filename: csvFiles.map((file) => file.name).join(FILENAME_LIST_SEPARATOR),
    imported: importCsvFiles(files, await uploadedTemplates(formData)),
  }
}
