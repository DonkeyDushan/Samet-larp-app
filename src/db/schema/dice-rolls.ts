import { sql } from 'drizzle-orm'
import { boolean, check, foreignKey, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { authorName } from './columns'
import { characters } from './characters'
import { rules } from './rules'
import { chapters, runs } from './runs'

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
