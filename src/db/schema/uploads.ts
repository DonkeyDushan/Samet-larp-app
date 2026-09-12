import { jsonb, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { authorName, bytea, createdAt } from './columns'
import { uploadKind } from './enums'
import { runs } from './runs'

/**
 * Every uploaded `.xlsx` and template, kept exactly as it arrived (§6.5).
 *
 * This replaces config versioning: a run has one valid config, and the archive
 * is what tells after the game which file a chapter was computed from. Rows are
 * never updated or deleted.
 */
export const uploadedFiles = pgTable(
  'uploaded_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    kind: uploadKind('kind').notNull(),
    filename: text('filename').notNull(),
    content: bytea('content').notNull(),
    /** Errors and warnings of the check the config passed (§10.2); config only. */
    importReport: jsonb('import_report'),
    note: text('note'),
    /** Mandatory for an emergency fix after the first computation (§6.5). */
    reason: text('reason'),
    createdAt: createdAt(),
    createdBy: authorName('created_by'),
  },
  (t) => [unique('uploaded_files_run_id_key').on(t.runId, t.id)],
)
