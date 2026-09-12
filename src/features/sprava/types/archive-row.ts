import type { uploadedFiles } from '@/db/schema'

/** What the archive list shows — file bytes stay in the database. */
export type ArchiveRow = Pick<
  typeof uploadedFiles.$inferSelect,
  'id' | 'kind' | 'filename' | 'note' | 'reason' | 'createdAt' | 'createdBy' | 'importReport'
>
