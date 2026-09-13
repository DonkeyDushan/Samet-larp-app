/** `undefined` when unset: the app then refuses every login instead of running open (§18). */
export const readAppPassword = (): string | undefined => process.env.APP_PASSWORD || undefined
