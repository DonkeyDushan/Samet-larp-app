import { COLOURED_RUN_LETTERS, RUN_LETTER_SEPARATOR, type RunThemeKey } from './constants/run-colors'

export const runThemeKey = (runId: string | undefined): RunThemeKey => {
  if (!runId) return 'none'

  const letter = runId.split(RUN_LETTER_SEPARATOR).at(-1) ?? ''

  return COLOURED_RUN_LETTERS.includes(letter) ? (letter as RunThemeKey) : 'other'
}
