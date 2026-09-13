/** Form field names shared by the run forms and the actions reading them. */
export const RUN_FIELDS = Object.freeze({
  runId: 'runId',
  startDate: 'startDate',
  label: 'label',
} as const)

/** Fits the run switcher option without wrapping the top bar. */
export const RUN_LABEL_MAX_LENGTH = 80
