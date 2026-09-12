import { sql } from 'drizzle-orm'
import { boolean, check, foreignKey, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { stateSource } from './enums'
import { characters } from './characters'
import { flags, scaleBands, scales } from './scales'
import { computations } from './computations'
import { chapters, runs } from './runs'

/**
 * Per-chapter snapshots of a character's own state (§4.3).
 *
 * State is snapshotted after each chapter and never overwritten. Every row
 * carries the `computation_id` that produced it; `NULL` is the initial state
 * from config (chapter 1).
 */
/**
 * A character's scale value in a chapter.
 *
 * `wasClamped` and `rawValue` keep what the engine computed before clamping —
 * without them badly calibrated weights go unnoticed.
 */
export const characterScaleValues = pgTable(
  'character_scale_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    scaleId: uuid('scale_id').notNull(),
    /** Final value, after clamping. */
    value: integer('value').notNull(),
    /** Value before clamping, when clamping happened. */
    rawValue: integer('raw_value'),
    wasClamped: boolean('was_clamped').notNull().default(false),
    /** Band derived from the value (§7.3, step 5). */
    bandId: uuid('band_id'),
    source: stateSource('source').notNull(),
    /** The computation that produced this value; NULL is the initial state. */
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_scale_values_unique')
      .on(t.runId, t.chapterId, t.characterId, t.scaleId, t.computationId)
      .nullsNotDistinct(),
    check('character_scale_values_range', sql`${t.value} between 1 and 10`),
    check(
      'character_scale_values_clamp_consistency',
      sql`(${t.wasClamped} = false) or (${t.rawValue} is not null and ${t.rawValue} <> ${t.value})`,
    ),
    foreignKey({
      name: 'character_scale_values_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scale_values_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scale_values_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scale_values_band_fk',
      columns: [t.runId, t.bandId],
      foreignColumns: [scaleBands.runId, scaleBands.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scale_values_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)

/** A character's flag in a chapter. Nothing is deleted: clearing is a new row with `value = false`. */
export const characterFlags = pgTable(
  'character_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    flagId: uuid('flag_id').notNull(),
    value: boolean('value').notNull(),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_flags_unique')
      .on(t.runId, t.chapterId, t.characterId, t.flagId, t.computationId)
      .nullsNotDistinct(),
    foreignKey({
      name: 'character_flags_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_flags_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_flags_flag_fk',
      columns: [t.runId, t.flagId],
      foreignColumns: [flags.runId, flags.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_flags_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Template variables (§8.4, §8.8): `{JMENO}`, `{PRIJMENI}`, `{VEK}`,
 * `{SKUPINA}` and whatever else a template author invents.
 *
 * A table of its own because a surname changes with marriage and age grows with
 * every time skip, so the value is per chapter, not per character. Overwriting
 * `characters.last_name` would lose the history and break rule 3.
 *
 * A value missing for a chapter is derived from `characters` and the state.
 */
export const characterVariables = pgTable(
  'character_variables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    /** Name without braces, upper case: `PRIJMENI`, `VEK`. */
    key: text('key').notNull(),
    value: text('value').notNull(),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_variables_unique')
      .on(t.runId, t.chapterId, t.characterId, t.key, t.computationId)
      .nullsNotDistinct(),
    check('character_variables_key_format', sql`${t.key} ~ '^[A-Z0-9_]+$'`),
    foreignKey({
      name: 'character_variables_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_variables_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_variables_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)
