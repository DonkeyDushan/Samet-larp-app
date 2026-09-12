import type { configVersions } from '@/db/schema'

/** What the version history needs — the stored snapshot stays on the server. */
export type VersionRow = Pick<
  typeof configVersions.$inferSelect,
  'id' | 'version' | 'isActive' | 'sourceFilename' | 'note' | 'createdAt' | 'createdBy' | 'importReport'
>
