import { importXlsx, readTemplateFiles, type ImportResult, type UploadedFile } from '@/import'
import { UPLOAD_FIELDS } from '../constants/upload-fields'
import { readFormFiles } from './read-form-field'

export interface ParsedUpload {
  filename: string
  imported: ImportResult
  /** Bytes as uploaded, for the run's archive (§6.5). */
  configFile: UploadedFile
  templateFiles: UploadedFile[]
}

/** Reads the uploaded config — one `.xlsx`, the only accepted format — and its templates. */
export const parseUpload = async (formData: FormData): Promise<ParsedUpload | undefined> => {
  const xlsx = formData.get(UPLOAD_FIELDS.config)
  if (!(xlsx instanceof File) || xlsx.size === 0) return undefined

  const configData = await xlsx.arrayBuffer()
  const rawTemplates = await Promise.all(
    readFormFiles(formData, UPLOAD_FIELDS.templates).map(async (file) => ({ filename: file.name, data: await file.arrayBuffer() })),
  )
  const templates = await readTemplateFiles(rawTemplates)

  return {
    filename: xlsx.name,
    imported: importXlsx(
      configData,
      templates.map((template) => ({ filename: template.filename, markdown: template.markdown })),
    ),
    configFile: { filename: xlsx.name, content: Buffer.from(configData) },
    templateFiles: rawTemplates.map((file) => ({ filename: file.filename, content: Buffer.from(file.data) })),
  }
}
