import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './columns'
import { templateKind } from './enums'
import { characters, groups } from './characters'
import { chapters, runs } from './runs'

/**
 * A document template: Markdown exported from a Google Doc (§8.3, §10.3).
 *
 * Filling works by deletion, not insertion: the template holds every paragraph
 * variant at once and the app removes the ones the engine did not select.
 * Markers are the paired `{BLOK <ID>}` … `{/BLOK}` plus variables `{JMENO}`,
 * `{PRIJMENI}`, `{VEK}`, `{SKUPINA}`. Nested blocks are unsupported and no
 * marker may survive into the finished document (§8.4).
 *
 * Re-uploading the same template makes a new version; the old one stays.
 * Exactly one version is active per (chapter, kind, character/group).
 *
 * `parsedBlocks` is the parse result from upload, feeding the §11 validations
 * (a block nothing can reach, a block the engine expects but the template lacks).
 */
export const templates = pgTable(
  'templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    kind: templateKind('kind').notNull(),
    /** Set when `kind = 'postava'`. */
    characterId: uuid('character_id'),
    /** Set when `kind = 'skupina'`. */
    groupId: uuid('group_id'),
    /** Template ID from the `Characters` sheet, when assignment goes through it. */
    externalId: text('external_id'),
    name: text('name').notNull(),
    sourceFilename: text('source_filename').notNull(),
    /** Raw Markdown with every paragraph variant. */
    markdown: text('markdown').notNull(),
    /** Found `{BLOK ID}` and `{PROMENNA}` markers plus any pairing errors. */
    parsedBlocks: jsonb('parsed_blocks'),
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    createdBy: authorName('created_by'),
  },
  (t) => [
    unique('templates_run_id_key').on(t.runId, t.id),
    uniqueIndex('templates_active_character')
      .on(t.runId, t.chapterId, t.characterId)
      .where(sql`${t.isActive} and ${t.kind} = 'postava'`),
    uniqueIndex('templates_active_group')
      .on(t.runId, t.chapterId, t.groupId)
      .where(sql`${t.isActive} and ${t.kind} = 'skupina'`),
    uniqueIndex('templates_active_singleton')
      .on(t.runId, t.chapterId, t.kind)
      .where(sql`${t.isActive} and ${t.kind} in ('highlighty', 'dotaznik')`),
    check(
      'templates_target_matches_kind',
      sql`case ${t.kind}
            when 'postava' then ${t.characterId} is not null and ${t.groupId} is null
            when 'skupina' then ${t.groupId} is not null and ${t.characterId} is null
            else ${t.characterId} is null and ${t.groupId} is null
          end`,
    ),
    foreignKey({
      name: 'templates_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'templates_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'templates_group_fk',
      columns: [t.runId, t.groupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
  ],
)
