import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { characters } from './characters'
import { chapters, configVersions, runs } from './runs'

/**
 * A template block from the `N_Content` sheet (§8.2) — the thing a
 * `{BLOK <ID>}` marker in a template stands for.
 *
 * Variants live here rather than in the template (§8.2, revised against the
 * real sheet): the template carries only the marker, so the author edits text
 * in the spreadsheet and never touches the document.
 */
export const contentBlocks = pgTable(
  'content_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** `Block ID` from the sheet, e.g. `B_Marie_2_Historie_1`. */
    externalId: text('external_id').notNull(),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('content_blocks_run_id_key').on(t.runId, t.id),
    unique('content_blocks_run_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'content_blocks_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'content_blocks_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'content_blocks_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)

/**
 * One variant of a block (§8.2). Variants are walked in ascending `priority`
 * and the first whose condition holds wins, so priority decides completely and
 * no conflict between variants can arise.
 *
 * `conditionExpr` stays as the author's text (§4.5): conditions are expressions
 * in one cell, parsed with `jsep`, not spread into structured columns. Keeping
 * the source text means a validation message can quote what the author wrote.
 * `conditionRefs` caches the identifiers the expression mentions, so
 * cross-reference checks do not re-parse.
 *
 * `text` may be empty — the "nothing happened" variant, whose marker vanishes
 * without a trace.
 */
export const blockVariations = pgTable(
  'block_variations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** `Variation ID`, e.g. `V_Marie_2_Historie_1_A`. */
    externalId: text('external_id').notNull(),
    blockId: uuid('block_id').notNull(),
    /** Lower runs first (§8.2). */
    priority: integer('priority').notNull(),
    /** The author's note; never reaches the document. */
    description: text('description'),
    text: text('text').notNull().default(''),
    /** Raw expression; `DEFAULT` is the always-true fallback. */
    conditionExpr: text('condition_expr').notNull(),
    /** Identifiers found in the expression, for the §11 cross-checks. */
    conditionRefs: jsonb('condition_refs'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('block_variations_run_id_key').on(t.runId, t.id),
    unique('block_variations_run_external_key').on(t.runId, t.externalId),
    // Two variants of one block with the same priority would make the result
    // depend on row order (§11.6e).
    unique('block_variations_block_priority_key').on(t.runId, t.blockId, t.priority),
    check('block_variations_priority_positive', sql`${t.priority} >= 1`),
    foreignKey({
      name: 'block_variations_block_fk',
      columns: [t.runId, t.blockId],
      foreignColumns: [contentBlocks.runId, contentBlocks.id],
    }).onDelete('restrict'),
  ],
)
