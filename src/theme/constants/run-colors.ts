/**
 * Per-run interface colour (rule 2, §3.3). Two runs are played at once, so the
 * run must be recognisable without reading: A is blue, B amber. The colours
 * live in the theme palette (`palette.run`), per light and dark scheme.
 */
export const RUN_THEME_KEYS = Object.freeze(['A', 'B', 'other', 'none'] as const)

export type RunThemeKey = (typeof RUN_THEME_KEYS)[number]

/** Run letters with a colour of their own; later runs fall back to `other`. */
export const COLOURED_RUN_LETTERS: readonly string[] = Object.freeze(['A', 'B'])
