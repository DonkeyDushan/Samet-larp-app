/** Allowed run letters, matching the `runs_letter_format` check in the schema. */
export const RUN_LETTERS: readonly string[] = Object.freeze('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))

/** Separates date and letter in `2026-09-12_A`. */
export const RUN_ID_SEPARATOR = '_'

export const runIdFor = (startDate: string, letter: string): string => `${startDate}${RUN_ID_SEPARATOR}${letter}`
