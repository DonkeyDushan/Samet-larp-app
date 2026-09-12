import { sql } from 'drizzle-orm'
import { boolean, check, foreignKey, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { stateSource } from './enums'
import { characters } from './characters'
import { households } from './households'
import { scaleBands, scales } from './scales'
import { computations } from './computations'
import { chapters, runs } from './runs'

/**
 * Per-chapter household membership and shared scale values (§4.4).
 *
 * State is snapshotted after each chapter and never overwritten. Every row
 * carries the `computation_id` that produced it; `NULL` is the initial state
 * from config (chapter 1).
 */
/**
 * Who lives in which household — a per-chapter snapshot (§4.4).
 *
 * A character is in at most one household at a time, enforced by a unique on
 * (run, chapter, character, computation) rather than by a consistency check:
 * reading shared values rests on that invariant.
 *
 * Every character gets a household of one when the run starts, so this table is
 * never sparse and the engine needs no "no household" branch.
 */
export const householdMemberships = pgTable(
  'household_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    householdId: uuid('household_id').notNull(),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('household_memberships_one_per_character')
      .on(t.runId, t.chapterId, t.characterId, t.computationId)
      .nullsNotDistinct(),
    foreignKey({
      name: 'household_memberships_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_memberships_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_memberships_household_fk',
      columns: [t.runId, t.householdId],
      foreignColumns: [households.runId, households.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_memberships_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)

/**
 * A shared scale's value (§4.4) — owned by the household, not by a character.
 *
 * `postava` scales belong in `character_scale_values`, `domacnost` ones here.
 * The database cannot check that a row matches its scale's scope (it spans
 * tables); the §11 consistency check does.
 *
 * Clamping is recorded as for character scales. It matters more here: several
 * people contribute, so the bound is reached sooner.
 */
export const householdScaleValues = pgTable(
  'household_scale_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    householdId: uuid('household_id').notNull(),
    scaleId: uuid('scale_id').notNull(),
    value: integer('value').notNull(),
    rawValue: integer('raw_value'),
    wasClamped: boolean('was_clamped').notNull().default(false),
    bandId: uuid('band_id'),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('household_scale_values_unique')
      .on(t.runId, t.chapterId, t.householdId, t.scaleId, t.computationId)
      .nullsNotDistinct(),
    check('household_scale_values_range', sql`${t.value} between 1 and 10`),
    check(
      'household_scale_values_clamp_consistency',
      sql`(${t.wasClamped} = false) or (${t.rawValue} is not null and ${t.rawValue} <> ${t.value})`,
    ),
    foreignKey({
      name: 'household_scale_values_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_scale_values_household_fk',
      columns: [t.runId, t.householdId],
      foreignColumns: [households.runId, households.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_scale_values_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_scale_values_band_fk',
      columns: [t.runId, t.bandId],
      foreignColumns: [scaleBands.runId, scaleBands.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_scale_values_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)
