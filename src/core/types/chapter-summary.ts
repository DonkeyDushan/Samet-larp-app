import type { chapters } from '@/db/schema'

/** What the top bar shows about a chapter (§6.4). */
export type ChapterSummary = Pick<typeof chapters.$inferSelect, 'number' | 'status' | 'isTouched'>
