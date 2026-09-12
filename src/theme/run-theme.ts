import { FALLBACK_RUN_COLORS, NO_RUN_COLORS, RUN_COLORS, RUN_LETTER_SEPARATOR, type RunColors } from './constants/run-colors'

export const runTheme = (runId: string | undefined): RunColors => {
  if (!runId) return NO_RUN_COLORS

  const letter = runId.split(RUN_LETTER_SEPARATOR).at(-1) ?? ''

  return RUN_COLORS[letter] ?? FALLBACK_RUN_COLORS
}
