/**
 * Per-run interface colour (rule 2 in CLAUDE.md, §3.3).
 *
 * Two runs are played at once, so the run must be visible without reading:
 * A is blue, B amber. Anything beyond B falls back to slate rather than
 * inventing a colour nobody would recognise.
 */
export interface RunTheme {
  letter: string
  /** Tailwind classes for the header band. */
  header: string
  /** Classes for an accent border used on panels. */
  accent: string
  label: string
}

const THEMES: Record<string, Omit<RunTheme, 'letter'>> = {
  A: {
    header: 'bg-blue-700 text-white',
    accent: 'border-blue-600',
    label: 'modrá',
  },
  B: {
    header: 'bg-amber-600 text-white',
    accent: 'border-amber-500',
    label: 'jantarová',
  },
}

export function runTheme(runId: string): RunTheme {
  const letter = runId.split('_').at(-1) ?? '?'
  const theme = THEMES[letter] ?? {
    header: 'bg-slate-700 text-white',
    accent: 'border-slate-500',
    label: 'šedá',
  }
  return { letter, ...theme }
}
