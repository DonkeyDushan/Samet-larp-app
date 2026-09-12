/** A `.md` template uploaded alongside the workbook (§10.3). */
export interface ParsedTemplate {
  externalId: string
  filename: string
  markdown: string
  blockIds: string[]
  variables: string[]
  problems: { line: number; raw: string; detail: string }[]
}

/** A template as it arrives from the upload, before its markers are read. */
export interface UploadedTemplate {
  filename: string
  markdown: string
}
