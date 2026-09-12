import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
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
import { computationKind, computationStatus } from './enums'
import { chapters, configVersions, runs } from './runs'

/**
 * Verze přepočtu (§5, kroky 4–6).
 *
 * Přepočet jde spustit **opakovaně a nedestruktivně** — každé spuštění je nový
 * řádek, nikdy update. `kind = 'rucni_uprava'` je verze vzniklá editací JSON
 * mezivýstupu; `parentComputationId` ukazuje, ze čeho vyšla. Org si tak může
 * pustit přepočet stokrát, než ho potvrdí.
 *
 * `resultJson` je kompletní stav v tom tvaru, ve kterém ho vrátil engine
 * (a ve kterém ho org edituje). Relační tabulky stavu v `state.ts` jsou z něj
 * odvozená **dotazovatelná projekce** pro přehledy; `resultJson` je nedotknutelný
 * archiv a základ pro `beh.json` (§10.4).
 *
 * `isReleased` říká, ze které verze se tisklo. Vydaná je nejvýš jedna verze na
 * kapitolu (vynuceno částečným unikátním indexem) a během hry je zdrojem pravdy
 * papír v rukou hráče, ne databáze (§3.2).
 */
export const computations = pgTable(
  'computations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    /** Pořadí verze v rámci kapitoly, od 1. */
    version: integer('version').notNull(),
    kind: computationKind('kind').notNull().default('prepocet'),
    status: computationStatus('status').notNull().default('navrh'),
    parentComputationId: uuid('parent_computation_id'),

    /** Konfigurace, se kterou se počítalo — pro dohledání po hře. */
    configVersionId: uuid('config_version_id').notNull(),
    /** Verze kódu enginu, aby šlo poznat, čím se to počítalo. */
    engineVersion: text('engine_version').notNull(),
    /**
     * Hash vstupů (stav + odpovědi + pravidla + hody). Stejný vstup = stejný
     * výstup (§2, bod 3); rozdílný hash u „stejného" přepočtu je poplach.
     */
    inputHash: text('input_hash').notNull(),

    /** Kompletní nový stav, jak ho vrátil engine (nebo jak ho org přepsal). */
    resultJson: jsonb('result_json').notNull(),
    /** `trace[]` — podklad pro vysvětlení „proč" v UI (§7.5). */
    traceJson: jsonb('trace_json').notNull(),
    /** Nevyřešené konflikty stejných priorit (§7.3). Blokují potvrzení. */
    conflictsJson: jsonb('conflicts_json'),

    /** Důvod přepočtu / editace. U vydané kapitoly povinný (§3.2). */
    reason: text('reason'),

    isReleased: boolean('is_released').notNull().default(false),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }),
    confirmedBy: text('confirmed_by'),

    createdAt: createdAt(),
    createdBy: authorName('created_by'),
  },
  (t) => [
    unique('computations_run_id_key').on(t.runId, t.id),
    unique('computations_chapter_version_key').on(t.runId, t.chapterId, t.version),
    uniqueIndex('computations_one_released_per_chapter')
      .on(t.runId, t.chapterId)
      .where(sql`${t.isReleased}`),
    check('computations_version_positive', sql`${t.version} >= 1`),
    check(
      'computations_manual_has_parent',
      sql`${t.kind} <> 'rucni_uprava' or ${t.parentComputationId} is not null`,
    ),
    foreignKey({
      name: 'computations_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'computations_parent_fk',
      columns: [t.runId, t.parentComputationId],
      foreignColumns: [t.runId, t.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'computations_config_version_fk',
      columns: [t.runId, t.configVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)
