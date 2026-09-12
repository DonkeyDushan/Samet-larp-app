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
 * A run of the game — the top level of data isolation (§3.2, §3.3).
 * Deliberately not "session": that word is taken by the login session.
 *
 * `id` is the readable `2026-09-12_A` and is reused in export filenames (§10.4).
 */
export const runs = pgTable(
  'runs',
  {
    id: text('id').primaryKey(),
    startDate: text('start_date').notNull(),
    /** Run letter (`A`, `B`); also drives the UI colour (§3.3). */
    letter: text('letter').notNull(),
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
 * A version of the imported config (§6.5, §10.2).
 *
 * Bound to a run: two concurrent runs may have different question versions.
 * Re-importing creates a new version with a diff against the previous one; the
 * old one is never overwritten. Exactly one version is active, enforced by a
 * partial unique index.
 */
export const configVersions = pgTable(
  'config_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    version: integer('version').notNull(),
    /** The version the run computes from. Exactly one per run. */
    isActive: boolean('is_active').notNull().default(false),
    sourceFilename: text('source_filename').notNull(),
    /** Detects a re-import of identical content. */
    sourceHash: text('source_hash').notNull(),
    /** Diff against the previous version, for the admin screen. */
    diffFromPrevious: jsonb('diff_from_previous'),
    /**
     * Flat snapshot of what this version contains, so the next import can diff
     * against it without re-parsing the old upload.
     */
    contentSnapshot: jsonb('content_snapshot'),
    /** Import errors and warnings, pointing at sheet and row (§10.2). */
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
 * Chapter within a run (1–3). All three rows are created with the run so that
 * config import has something to attach questions to.
 *
 * `isTouched` is the cascade from §3.2: a change in an already released chapter
 * marks the following ones as touched, and the app recomputes nothing on its
 * own — it waits for the org's `cascadeDecision`.
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

    /** Released: documents are printed and in the players' hands (§3.2). */
    releasedAt: timestamp('released_at', { withTimezone: true, mode: 'date' }),
    releasedBy: text('released_by'),
    // Which computation was released lives in `computations.is_released`,
    // not here — otherwise the foreign keys would be circular.

    /** Cascade (§3.2). */
    isTouched: boolean('is_touched').notNull().default(false),
    touchedAt: timestamp('touched_at', { withTimezone: true, mode: 'date' }),
    touchedReason: text('touched_reason'),
    cascadeDecision: cascadeDecision('cascade_decision'),
    cascadeDecidedAt: timestamp('cascade_decided_at', { withTimezone: true, mode: 'date' }),
    cascadeDecidedBy: text('cascade_decided_by'),
    /**
     * Set when the org chose to keep the released state: the computed state
     * differs from what the players hold. The app must say so out loud.
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

