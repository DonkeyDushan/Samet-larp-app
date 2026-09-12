import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './_shared'
import { cascadeDecision, chapterStatus, runStatus } from './enums'

/**
 * Běh hry — nejvyšší úroveň izolace dat (§3.2, §3.3).
 * Záměrně **ne** „session": to slovo je v kódu obsazené přihlašovací relací.
 *
 * `id` je čitelný identifikátor `2026-09-12_A` a používá se i v názvech
 * exportovaných souborů (§10.4).
 */
export const runs = pgTable(
  'runs',
  {
    id: text('id').primaryKey(),
    /** Datum zahájení, ze kterého se odvozuje `id`. */
    startDate: text('start_date').notNull(),
    /** Písmeno běhu (`A`, `B`) — určuje i barvu rozhraní (§3.3, bod 2). */
    letter: text('letter').notNull(),
    /** Volitelný popisný název („Podzimní běh, sobotní parta"). */
    label: text('label'),
    status: runStatus('status').notNull().default('zalozen'),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
    createdAt: createdAt(),
    createdBy: authorName('created_by'),
  },
  (t) => [
    check('runs_id_format', sql`${t.id} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}_[A-Z]$'`),
    check('runs_letter_format', sql`${t.letter} ~ '^[A-Z]$'`),
  ],
)

/**
 * Verze importované konfigurace (§6.5, §10.2).
 *
 * Verze je **vázaná na běh**: dva souběžné běhy mohou mít různé verze otázek.
 * Opakovaný import do běhu vytvoří novou verzi s diffem proti předchozí;
 * stará verze se nikdy nepřepisuje. Aktivní verze je právě jedna
 * (vynuceno částečným unikátním indexem).
 */
export const configVersions = pgTable(
  'config_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Pořadí verze v rámci běhu, od 1. */
    version: integer('version').notNull(),
    /** Aktivní verze, ze které běh počítá. Právě jedna na běh. */
    isActive: boolean('is_active').notNull().default(false),
    sourceFilename: text('source_filename').notNull(),
    /** Hash nahraného souboru — pozná opakovaný import téhož obsahu. */
    sourceHash: text('source_hash').notNull(),
    /** Diff proti předchozí verzi, pro obrazovku Správa. */
    diffFromPrevious: jsonb('diff_from_previous'),
    /** Chyby a varování importu s odkazem na list a řádek (§10.2). */
    importReport: jsonb('import_report'),
    note: text('note'),
    createdAt: createdAt(),
    createdBy: authorName('created_by'),
  },
  (t) => [
    unique('config_versions_run_id_key').on(t.runId, t.id),
    unique('config_versions_run_version_key').on(t.runId, t.version),
    uniqueIndex('config_versions_one_active_per_run')
      .on(t.runId)
      .where(sql`${t.isActive}`),
    check('config_versions_version_positive', sql`${t.version} >= 1`),
  ],
)

/**
 * Kapitola v rámci běhu (1–3). Řádky pro všechny tři kapitoly vznikají
 * při založení běhu, aby na ně mohla konfigurace navázat otázky.
 *
 * `isTouched` je kaskáda z §3.2: změna v už vydané kapitole označí následující
 * kapitoly jako dotčené a aplikace **sama nic nepřepočítá** — čeká na vědomé
 * rozhodnutí orga (`cascadeDecision`).
 */
export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    number: integer('number').notNull(),
    status: chapterStatus('status').notNull().default('rozpracovana'),

    /** Vydání: dokumenty jsou vytištěné a v rukou hráčů (§3.2). */
    releasedAt: timestamp('released_at', { withTimezone: true, mode: 'date' }),
    releasedBy: text('released_by'),
    /**
     * Která verze přepočtu byla vydána, se nedrží tady, ale příznakem
     * `computations.is_released` — jinak by vznikl kruhový cizí klíč.
     * Během hry je zdrojem pravdy papír v rukou hráče, ne databáze.
     */

    /** Kaskáda (§3.2). */
    isTouched: boolean('is_touched').notNull().default(false),
    touchedAt: timestamp('touched_at', { withTimezone: true, mode: 'date' }),
    touchedReason: text('touched_reason'),
    cascadeDecision: cascadeDecision('cascade_decision'),
    cascadeDecidedAt: timestamp('cascade_decided_at', { withTimezone: true, mode: 'date' }),
    cascadeDecidedBy: text('cascade_decided_by'),
    /**
     * True, když org zvolil „ponechat jak je": vypočtený stav se rozchází
     * s tím, co drží hráči v ruce. Aplikace to musí umět říct nahlas.
     */
    divergesFromReleased: boolean('diverges_from_released').notNull().default(false),
    divergenceNote: text('divergence_note'),

    createdAt: createdAt(),
  },
  (t) => [
    unique('chapters_run_id_key').on(t.runId, t.id),
    unique('chapters_run_number_key').on(t.runId, t.number),
    check('chapters_number_range', sql`${t.number} between 1 and 3`),
  ],
)

