import { COLOURED_RUN_LETTERS, type RunThemeKey } from './constants/run-colors'

export const runThemeKey = (letter: string | undefined): RunThemeKey => {
  if (!letter) return 'none'

  return COLOURED_RUN_LETTERS.includes(letter) ? (letter as RunThemeKey) : 'other'
}
