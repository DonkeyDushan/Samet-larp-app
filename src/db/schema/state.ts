import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './_shared'
import { groupRole, stateSource } from './enums'
import { characters, groups } from './characters'
import { households } from './households'
import { flags, scaleBands, scales } from './scales'
import { rules } from './rules'
import { computations } from './computations'
import { chapters, runs } from './runs'

/**
 * Per-chapter snapshots of character and group state (§4.3).
 *
 * State is snapshotted after each chapter and never overwritten. Every row
 * carries the `computation_id` that produced it; `NULL` is the initial state
 * from config (chapter 1).
 *
 * These tables are a queryable projection of `computations.result_json`, so an
 * overview of everyone's scales is one query rather than a JSON dig.
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

/** Per-chapter snapshot of group membership; the leader is `role = 'vedouci'`. */
export const groupMemberships = pgTable(
  'group_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    groupId: uuid('group_id').notNull(),
    role: groupRole('role').notNull().default('clen'),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('group_memberships_unique')
      .on(t.runId, t.chapterId, t.characterId, t.groupId, t.computationId)
      .nullsNotDistinct(),
    foreignKey({
      name: 'group_memberships_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'group_memberships_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'group_memberships_group_fk',
      columns: [t.runId, t.groupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'group_memberships_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)

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

/**
 * A dice roll (§7.4). Rolled once and stored per character, chapter and rule,
 * exactly like a player's answer.
 *
 * Recomputation never re-rolls; only an explicit org action can, keeping the old
 * number in `previousValue` and the whole change in the audit.
 *
 * A table of its own rather than a column on `answers`, because a roll belongs
 * to a rule, not to a question.
 */
export const diceRolls = pgTable(
  'dice_rolls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    ruleId: uuid('rule_id').notNull(),
    sides: integer('sides').notNull(),
    value: integer('value').notNull(),
    /** Value before a re-roll or a manual override. */
    previousValue: integer('previous_value'),
    /** The org typed the number in; it was not rolled. */
    isManualOverride: boolean('is_manual_override').notNull().default(false),
    rerollCount: integer('reroll_count').notNull().default(0),
    rolledAt: timestamp('rolled_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    rolledBy: authorName('rolled_by'),
    reason: text('reason'),
  },
  (t) => [
    unique('dice_rolls_unique').on(t.runId, t.chapterId, t.characterId, t.ruleId),
    check('dice_rolls_value_in_range', sql`${t.value} between 1 and ${t.sides}`),
    check('dice_rolls_sides_sane', sql`${t.sides} >= 2`),
    foreignKey({
      name: 'dice_rolls_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'dice_rolls_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'dice_rolls_rule_fk',
      columns: [t.runId, t.ruleId],
      foreignColumns: [rules.runId, rules.id],
    }).onDelete('restrict'),
  ],
)
