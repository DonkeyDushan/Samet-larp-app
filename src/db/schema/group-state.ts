import { foreignKey, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { groupRole, stateSource } from './enums'
import { characters, groups } from './characters'
import { computations } from './computations'
import { chapters, runs } from './runs'

/**
 * Per-chapter snapshot of group membership and leadership (§4.3).
 *
 * State is snapshotted after each chapter and never overwritten. Every row
 * carries the `computation_id` that produced it; `NULL` is the initial state
 * from config (chapter 1).
 */
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
