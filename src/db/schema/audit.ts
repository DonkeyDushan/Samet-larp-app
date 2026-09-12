import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './_shared'
import { computations } from './computations'
import { rules } from './rules'
import { chapters, runs } from './runs'

/**
 * Audit log (§2 bod 2, §13). **Append-only** — UPDATE a DELETE na téhle tabulce
 * blokuje databázový trigger, viz `db/sql/001_audit_append_only.sql`.
 * Není to jen konvence; je to vynucené.
 *
 * U každé změny musí být: **kdo** (volné jméno z pole „Kdo jsi?"), **kdy**,
 * **co**, hodnota **před** a **po**, a **které pravidlo** změnu způsobilo.
 *
 * Zapisuje se sem i to, co není změna dat, ale rozhodnutí orga:
 * ořez škály na hranici, přehození kostky, editace vydané kapitoly s důvodem,
 * rozhodnutí o dotčené kapitole, import nové verze konfigurace.
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
     * Co se stalo, v doménových slovech: `odpoved.zmena`, `skala.orez`,
     * `kostka.prehozeni`, `kapitola.vydani`, `kapitola.editace_po_vydani`,
     * `kaskada.rozhodnuti`, `konfigurace.import`, `prepocet.potvrzeni`.
     * Volný text záměrně: enum by se musel měnit s každou novou akcí.
     */
    action: text('action').notNull(),
    /** Tabulka nebo doménová entita, které se změna týká. */
    entityKind: text('entity_kind').notNull(),
    entityId: text('entity_id'),
    /** Čitelný popis pro člověka, který to bude po hře číst. */
    summary: text('summary'),

    valueBefore: jsonb('value_before'),
    valueAfter: jsonb('value_after'),

    /** Pravidlo, které změnu způsobilo — jádro odpovědi na „proč". */
    ruleId: uuid('rule_id'),
    /** Verze přepočtu, v rámci které změna vznikla. */
    computationId: uuid('computation_id'),
    /** Odůvodnění od orga — povinné u editace vydané kapitoly (§3.2). */
    reason: text('reason'),

    createdAt: createdAt(),
    author: authorName(),
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
