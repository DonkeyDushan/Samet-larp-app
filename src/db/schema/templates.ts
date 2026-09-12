import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './_shared'
import { templateKind } from './enums'
import { characters, groups } from './characters'
import { chapters, runs } from './runs'

/**
 * Šablona dokumentu jako Markdown stažený z Google Docu (§8.3, §10.3).
 *
 * Model naplnění je **mazání, ne vkládání**: šablona obsahuje všechny varianty
 * odstavců zároveň a aplikace maže ty, které engine nevybral. Značky jsou párové
 * `{BLOK <ID>}` … `{/BLOK}` plus proměnné `{JMENO}`, `{PRIJMENI}`, `{VEK}`,
 * `{SKUPINA}`. Vnořené bloky se nepodporují a **žádná značka nesmí přežít**
 * do výsledného dokumentu (§8.4).
 *
 * Nahrání stejné šablony znovu = nová verze, stará zůstává. Aktivní verze je
 * právě jedna na (kapitola, typ, postava/skupina).
 *
 * `parsedBlocks` je výsledek rozparsování značek při nahrání — slouží
 * validacím §11 (blok bez cesty, blok očekávaný enginem a chybějící v šabloně).
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
    /** Vyplněné u `kind = 'postava'`. */
    characterId: uuid('character_id'),
    /** Vyplněné u `kind = 'skupina'`. */
    groupId: uuid('group_id'),
    /** ID šablony z listu `Characters`, když se přiřazuje podle něj. */
    externalId: text('external_id'),
    name: text('name').notNull(),
    sourceFilename: text('source_filename').notNull(),
    /** Surový Markdown se všemi variantami odstavců. */
    markdown: text('markdown').notNull(),
    /** Seznam nalezených `{BLOK ID}` a `{PROMENNA}` + případné chyby párování. */
    parsedBlocks: jsonb('parsed_blocks'),
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    createdBy: authorName(),
  },
  (t) => [
    uniqueIndex('templates_run_id_key').on(t.runId, t.id),
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
