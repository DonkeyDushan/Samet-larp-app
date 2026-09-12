import { foreignKey, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { chapters, runs } from './runs'

/**
 * Household (§4.4) — characters sharing economic values, typically spouses.
 *
 * Shared values must never be handled by copying between characters, so a
 * household has its own identity and its own scale values
 * (`household_scale_values`).
 *
 * A single character is technically a household of one; one is created per
 * character when the run starts, which removes the "character without a
 * household" branch from the engine.
 *
 * The household's identity survives chapters; who belongs to it is a
 * per-chapter snapshot in `household_memberships`. A divorce therefore deletes
 * nothing, it just produces different membership in the next chapter.
 */
export const households = pgTable(
  'households',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Generated ID, e.g. `H_Marie` or `H_Marie_Mirek`. */
    externalId: text('external_id').notNull(),
    /** For the org only; never enters documents. */
    label: text('label'),
    createdInChapterId: uuid('created_in_chapter_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('households_run_id_key').on(t.runId, t.id),
    unique('households_run_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'households_chapter_fk',
      columns: [t.runId, t.createdInChapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
  ],
)
