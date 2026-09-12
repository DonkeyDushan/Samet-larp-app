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
import { createdAt } from './_shared'
import { characters } from './characters'
import { configVersions, runs } from './runs'

/**
 * Definice škály (§4.1). Např. `Wealth`, `Regime`, `Control`, `Bony`.
 *
 * Rozsah je celá čísla 1–10; `minValue` / `maxValue` jsou v datech, aby se
 * hranice nemusela hledat v kódu. Hodnoty mimo rozsah se **ořezávají**
 * (clamp), ne obtáčejí, a každý ořez se zapíše do auditu — je to signál
 * špatně nakalibrovaných vah.
 */
export const scales = pgTable(
  'scales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Klíč škály bez prefixu postavy: `Wealth`. */
    key: text('key').notNull(),
    /** Jak se škála jmenuje v UI a v přehledu. */
    label: text('label').notNull(),
    description: text('description'),
    minValue: integer('min_value').notNull().default(1),
    maxValue: integer('max_value').notNull().default(10),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('scales_run_id_key').on(t.runId, t.id),
    unique('scales_run_key_key').on(t.runId, t.key),
    check('scales_range_sane', sql`${t.minValue} < ${t.maxValue}`),
    // Rozsah 1–10 je rozhodnutí zadání (§4.1), ne konfigurace. Sloupce existují,
    // aby engine hranice nečetl z kódu, ale ven z 1–10 se dostat nesmí.
    check('scales_range_within_1_10', sql`${t.minValue} >= 1 and ${t.maxValue} <= 10`),
    foreignKey({
      name: 'scales_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Pásmo škály (§4.1). Prahy **i názvy jsou v datech, nikdy v kódu.**
 *
 * Výchozí rozdělení je 1–3 / 4–5 / 6–8 / 9–10, ale počet pásem i hranice
 * jsou vlastní pro každou škálu — `Wealth` má „Na dně / Vyžije / Zajištěná /
 * Zazobaná", `Regime` úplně jiné.
 */
export const scaleBands = pgTable(
  'scale_bands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    scaleId: uuid('scale_id').notNull(),
    /** Pořadí pásma od nejnižšího, od 1. */
    ordinal: integer('ordinal').notNull(),
    /** Hranice včetně: pásmo 1–3 má minValue=1, maxValue=3. */
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
 * Které škály se u které postavy vůbec sledují.
 *
 * Ne každá postava má každou škálu; zdrojová tabulka to říká přes ID tvaru
 * `S_<Postava>_<Skala>` (§4.2). Tady je ten vztah rozložený na postavu + škálu
 * a nese počáteční hodnotu pro kapitolu 1 z listu `Characters`.
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
    /** Plné ID ze zdrojové tabulky, např. `S_Marie_Wealth`. */
    externalId: text('external_id').notNull(),
    /** Počáteční hodnota pro kapitolu 1 (§4.2, list `Characters`). */
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
 * Definice příznaku (§4.1): `Svatba`, `Odchod_do_duchodu`, `Firemni_byt`.
 * Škály jsou preferované; příznak je pro události, které opravdu jsou ano/ne.
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
