import type { Route } from 'next'

/** Entry screen: pick or create a run (§3.2). */
export const HOME_ROUTE = '/'

/** Shared-password screen (§3.1); the only route the access check lets through. */
export const LOGIN_ROUTE = '/prihlaseni'

/** Query parameter carrying where to return after logging in. */
export const RETURN_PATH_PARAM = 'dal'

/** The five sections of the top bar, in display order (§6.4). */
export const RUN_SECTIONS = Object.freeze(['postavy', 'skupiny', 'prepocet', 'vystupy', 'sprava'] as const)

export type RunSection = (typeof RUN_SECTIONS)[number]

/** Where opening a run lands — transcribing questionnaires is the everyday work. */
export const DEFAULT_RUN_SECTION: RunSection = 'postavy'

/** A freshly created run has no config yet, so it starts in Správa. */
export const NEW_RUN_SECTION: RunSection = 'sprava'

/**
 * The run lives in the URL path, not in a cookie: two tabs may each hold a
 * different run, and a cookie shared by both would silently switch one of them.
 */
export const runPath = (runId: string): string => `/beh/${encodeURIComponent(runId)}`

// typedRoutes cannot follow a runtime run ID; the path shape matches `app/beh/[runId]/<section>`.
export const runRoute = (runId: string, section: RunSection): Route => `${runPath(runId)}/${section}` as Route

export const isRunSection = (value: string | null): value is RunSection =>
  value !== null && (RUN_SECTIONS as readonly string[]).includes(value)
