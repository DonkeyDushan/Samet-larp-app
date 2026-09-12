import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { mergeStrategy, scaleScope, splitStrategy } from './enums'
import { characters } from './characters'
import { configVersions, runs } from './runs'

/**
 * Scale definition (§4.1), e.g. `Wealth`, `Regime`, `Control`, `Bony`.
 *
 * Values are integers 1–10. `minValue` / `maxValue` live in data so the engine
 * never reads bounds from code. Out-of-range values are clamped, not wrapped,
 * and every clamp is audited — it signals badly calibrated weights.
 *
 * `scope` decides who owns the value (§4.4): `postava` scales store values in
 * `character_scale_values`, `domacnost` scales in `household_scale_values`.
 * A shared value is never copied between characters; it has its own owner.
 */
export const scales = pgTable(
  'scales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Scale key without the character prefix: `Wealth`. */
    key: text('key').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    minValue: integer('min_value').notNull().default(1),
    maxValue: integer('max_value').notNull().default(10),
    /** Who owns the value — the character or the household (§4.4). */
    scope: scaleScope('scope').notNull().default('postava'),
    /** Merge on marriage; `domacnost` scales only. */
    mergeStrategy: mergeStrategy('merge_strategy'),
    /** Split on divorce or death; `domacnost` scales only. */
    splitStrategy: splitStrategy('split_strategy'),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('scales_run_id_key').on(t.runId, t.id),
    unique('scales_run_key_key').on(t.runId, t.key),
    check('scales_range_sane', sql`${t.minValue} < ${t.maxValue}`),
    // 1–10 is a spec decision (§4.1), not config: the columns exist so the engine
    // reads bounds from data, but they must not leave that range.
    check('scales_range_within_1_10', sql`${t.minValue} >= 1 and ${t.maxValue} <= 10`),
    // Merge and split only mean something on shared scales; requiring them exactly
    // there keeps settings that nobody would ever use off character scales.
    check(
      'scales_household_strategies',
      sql`(${t.scope} = 'domacnost') = (${t.mergeStrategy} is not null and ${t.splitStrategy} is not null)`,
    ),
    foreignKey({
      name: 'scales_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Scale band (§4.1). Thresholds and names live in data, never in code: the
 * default split is 1–3 / 4–5 / 6–8 / 9–10, but both the count and the bounds
 * are per scale.
 */
export const scaleBands = pgTable(
  'scale_bands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    scaleId: uuid('scale_id').notNull(),
    /** Ascending from the lowest band, starting at 1. */
    ordinal: integer('ordinal').notNull(),
    /** Inclusive bounds: band 1–3 is minValue=1, maxValue=3. */
    minValue: integer('min_value').notNull(),
    maxValue: integer('max_value').notNull(),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('scale_bands_run_id_key').on(t.runId, t.id),
    unique('scale_bands_scale_ordinal_key').on(t.runId, t.scaleId, t.ordinal),
    check('scale_bands_bounds', sql`${t.minValue} <= ${t.maxValue}`),
    check('scale_bands_within_1_10', sql`${t.minValue} >= 1 and ${t.maxValue} <= 10`),
    foreignKey({
      name: 'scale_bands_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Which scales are tracked for which character — not every character has every
 * scale. The source spreadsheet expresses this as `S_<Postava>_<Skala>` (§4.2);
 * here it is decomposed into character + scale.
 */
export const characterScales = pgTable(
  'character_scales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    characterId: uuid('character_id').notNull(),
    scaleId: uuid('scale_id').notNull(),
    /** Full ID from the source spreadsheet, e.g. `S_Marie_Wealth`. */
    externalId: text('external_id').notNull(),
    /** Starting value for chapter 1 (§4.2, `Characters` sheet). */
    initialValue: integer('initial_value').notNull(),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_scales_run_id_key').on(t.runId, t.id),
    unique('character_scales_unique').on(t.runId, t.characterId, t.scaleId),
    unique('character_scales_external_key').on(t.runId, t.externalId),
    check('character_scales_initial_range', sql`${t.initialValue} between 1 and 10`),
    foreignKey({
      name: 'character_scales_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scales_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scales_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Flag definition (§4.1): `Svatba`, `Odchod_do_duchodu`, `Firemni_byt`.
 * Scales are preferred; flags are for events that really are yes/no.
 */
export const flags = pgTable(
  'flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('flags_run_id_key').on(t.runId, t.id),
    unique('flags_run_key_key').on(t.runId, t.key),
    foreignKey({
      name: 'flags_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)
