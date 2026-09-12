/** Scales are integers 1–10 unless the sheet says otherwise (§4.1). */
export const DEFAULT_SCALE_MIN = 1

/** Upper bound used when the `Max` column is empty. */
export const DEFAULT_SCALE_MAX = 10

/** Priorities in `N_Content` start at 1; lower is evaluated first (§8.2). */
export const MIN_VARIATION_PRIORITY = 1

/** Known merge strategies for household scales (§4.4). */
export const MERGE_STRATEGIES = Object.freeze(['soucet', 'prumer', 'vyssi', 'otazka'])

/** Known split strategies, including the sheet's own spelling of `kopie`. */
export const SPLIT_STRATEGIES = Object.freeze(['kopie', 'polovina', 'otazka', 'kazdy_si_odnasi'])

/** How the sheet spells the default split — each takes the current value. */
export const SHEET_COPY_SPLIT_STRATEGY = 'kazdy_si_odnasi'

export const COPY_SPLIT_STRATEGY = 'kopie'
