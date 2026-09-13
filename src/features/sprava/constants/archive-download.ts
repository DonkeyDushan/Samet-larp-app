/** Archived file IDs are UUIDs; anything else in the URL is not worth a query. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const HTTP_NOT_FOUND = 404

/** The archive holds only what the upload accepts (§10.2). */
export const ARCHIVE_CONTENT_TYPES: Readonly<Record<string, string>> = Object.freeze({
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  md: 'text/markdown; charset=utf-8',
  zip: 'application/zip',
})

export const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

/** Path of an archived file; plain `<a href>`, so no typed route. */
export const archiveFilePath = (runPath: string, fileId: string): string => `${runPath}/sprava/archiv/${fileId}`

/** Run ID first, as in every export filename (§3.3). */
export const archiveDownloadName = (runId: string, filename: string): string => `${runId}_${filename}`
