/** Form field names shared by the upload form and the server actions that read it. */
export const UPLOAD_FIELDS = Object.freeze({
  runId: 'runId',
  config: 'config',
  configCsv: 'configCsv',
  templates: 'templates',
  author: 'author',
  note: 'note',
} as const)

/** File types accepted by each upload input. */
export const UPLOAD_ACCEPT = Object.freeze({
  config: '.xlsx',
  configCsv: '.csv',
  templates: '.md,.zip',
})

/** Joins the names of several uploaded `.csv` files into one report filename. */
export const FILENAME_LIST_SEPARATOR = ', '
