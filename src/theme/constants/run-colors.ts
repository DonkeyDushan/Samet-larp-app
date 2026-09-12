/**
 * Per-run interface colour (rule 2, §3.3). Two runs are played at once, so the
 * run must be recognisable without reading: A is blue, B amber.
 */
export interface RunColors {
  /** Header band. */
  header: string
  /** Accent border on panels. */
  accent: string
}

export const RUN_COLORS: Readonly<Record<string, RunColors>> = Object.freeze({
  A: Object.freeze({ header: 'bg-blue-700 text-white', accent: 'border-blue-600' }),
  B: Object.freeze({ header: 'bg-amber-600 text-white', accent: 'border-amber-500' }),
})

/** Runs beyond B get slate rather than a colour nobody would recognise. */
export const FALLBACK_RUN_COLORS: RunColors = Object.freeze({
  header: 'bg-slate-700 text-white',
  accent: 'border-slate-500',
})

/** Before any run exists. */
export const NO_RUN_COLORS: RunColors = Object.freeze({
  header: 'bg-neutral-800 text-white',
  accent: 'border-neutral-400',
})

/** The run letter is the last `_`-separated part of `2026-09-12_A`. */
export const RUN_LETTER_SEPARATOR = '_'
