/** Form field names shared by the upload form and the server actions that read it. */
export const UPLOAD_FIELDS = Object.freeze({
  runId: 'runId',
  config: 'config',
  templates: 'templates',
  note: 'note',
  reason: 'reason',
} as const)

/** File types accepted by each upload input. */
export const UPLOAD_ACCEPT = Object.freeze({
  config: '.xlsx',
  templates: '.md,.zip',
})
