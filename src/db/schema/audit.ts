import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './columns'
import { computations } from './computations'
import { rules } from './rules'
import { chapters, runs } from './runs'

/**
 * Audit log (§2, §13). Append-only, enforced by a database trigger in
 * `db/sql/001_audit_append_only.sql` — not merely a convention.
 *
 * Every change records who (the free-text name from the identity field), when,
 * what, the value before and after, and which rule caused it.
 *
 * Org decisions land here too, not just data changes: a scale clamped at a
 * bound, a re-rolled die, an edit to a released chapter and its reason, a
 * cascade decision, an import of a new config version.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id'),

    /**
     * What happened, in domain words: `odpoved.zmena`, `skala.orez`,
     * `kostka.prehozeni`, `kapitola.vydani`, `kapitola.editace_po_vydani`,
     * `kaskada.rozhodnuti`, `konfigurace.import`, `prepocet.potvrzeni`.
     * Free text on purpose: an enum would change with every new action.
     */
    action: text('action').notNull(),
    /** The table or domain entity the change concerns. */
    entityKind: text('entity_kind').notNull(),
    entityId: text('entity_id'),
    /** Readable description for whoever reads this after the game. */
    summary: text('summary'),

    valueBefore: jsonb('value_before'),
    valueAfter: jsonb('value_after'),

    /** The rule that caused the change — the core of the "why". */
    ruleId: uuid('rule_id'),
    /** The computation version the change arose in. */
    computationId: uuid('computation_id'),
    /** The org's justification; mandatory when editing a released chapter (§3.2). */
    reason: text('reason'),

    createdAt: createdAt(),
    author: authorName('author'),
  },
  (t) => [
    index('audit_log_run_created_idx').on(t.runId, t.createdAt),
    index('audit_log_entity_idx').on(t.runId, t.entityKind, t.entityId),
    foreignKey({
      name: 'audit_log_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'audit_log_rule_fk',
      columns: [t.runId, t.ruleId],
      foreignColumns: [rules.runId, rules.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'audit_log_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)
