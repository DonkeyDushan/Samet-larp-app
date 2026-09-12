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
import { flags, scaleBands, scales } from './scales'
import { rules } from './rules'
import { computations } from './computations'
import { chapters, runs } from './runs'

/**
 * Stav postav a skupin v kapitole — snapshoty (§4.3).
 *
 * Stav se **ukládá jako snapshot po každé kapitole a nikdy se nepřepisuje.**
 * Každý řádek nese `computation_id` verze přepočtu, která ho vyrobila;
 * `NULL` znamená počáteční stav z konfigurace (kapitola 1).
 *
 * Tyhle tabulky jsou dotazovatelná projekce toho, co drží
 * `computations.result_json` — díky nim jde vypsat přehled škál všech postav
 * jedním dotazem, aniž by se prohrabával JSON.
 */

/**
 * Hodnota škály postavy v kapitole.
 *
 * Celé číslo v rozsahu 1–10 (kontrolované i databází). `wasClamped` a `rawValue`
 * drží, co engine spočítal **před** ořezem — bez toho se špatně nakalibrované
 * váhy nepoznají.
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
    /** Výsledná hodnota po ořezu. */
    value: integer('value').notNull(),
    /** Hodnota před ořezem, když se ořezávalo. */
    rawValue: integer('raw_value'),
    wasClamped: boolean('was_clamped').notNull().default(false),
    /** Pásmo vyhodnocené z hodnoty (krok 4 pořadí vyhodnocení, §7.3). */
    bandId: uuid('band_id'),
    source: stateSource('source').notNull(),
    /** Verze přepočtu, která hodnotu vyrobila. NULL = počáteční stav. */
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

/**
 * Hodnota příznaku u postavy v kapitole. Příznak se nemaže — zrušení je nový
 * řádek s `value = false`.
 */
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
 * Členství a vedení skupiny jako snapshot na kapitolu.
 * Kdo skupinu vede, je `role = 'vedouci'`.
 */
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
 * Proměnné postavy pro naplnění šablony (§8.4, §8.8): `{JMENO}`, `{PRIJMENI}`,
 * `{VEK}`, `{SKUPINA}` a cokoli dalšího, co si autor v šabloně vymyslí.
 *
 * Proč vlastní tabulka: příjmení se sňatkem mění a věk roste s každým časovým
 * skokem, takže hodnota je **per kapitola**, ne per postava. Kdyby se přepisovala
 * `characters.last_name`, ztratí se historie a poruší se pravidlo 3.
 *
 * Hodnota, která pro kapitolu chybí, se dopočítá z `characters` a stavu postavy.
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
    /** Název bez složených závorek, velkými písmeny: `PRIJMENI`, `VEK`. */
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
 * Hod kostkou (§7.4). Hodí se **jednou** a uloží se jako data u postavy,
 * kapitoly a pravidla — stejně jako odpověď hráče.
 *
 * **Přepočet hod neopakuje**, použije uložené číslo. Přehodit nebo přepsat lze
 * jen výslovnou akcí orga; předchozí hodnota zůstává v `previousValue` a celá
 * změna jde do auditu.
 *
 * Vlastní tabulka (a ne sloupec v `answers`) proto, že hod je navázaný na
 * **pravidlo**, ne na otázku.
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
    /** Hodnota před přehozením nebo ručním přepsáním. */
    previousValue: integer('previous_value'),
    /** Org číslo přepsal ručně, nepadlo. */
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
