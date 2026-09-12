import {
  foreignKey,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt } from './_shared'
import { configVersions, runs } from './runs'

/**
 * Group / organisation / gang (§4.1). Members and leadership are not here:
 * they change per chapter and live in `group_memberships` as a snapshot.
 */
export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** ID from the source spreadsheet, e.g. `G_SrdceParty`. */
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('groups_run_id_key').on(t.runId, t.id),
    unique('groups_run_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'groups_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)

/**
 * A character in a run (§4.2). A minimal registry: nothing beyond scales, flags
 * and membership is modelled — characterisation lives in fixed template text.
 *
 * `firstName` / `lastName` are the config defaults. Marriage changes the
 * surname, so texts never hardcode a name (§8.8) and the current value comes
 * from `character_variables` for the given chapter.
 */
export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** ID from the `Characters` sheet, e.g. `Marie`; feeds the question ID convention. */
    externalId: text('external_id').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    /** Birth year, used to compute `{VEK}` in each chapter. */
    birthYear: integer('birth_year'),
    /** Default group from config; current membership is in `group_memberships`. */
    homeGroupId: uuid('home_group_id'),
    /** Document template ID from the `Characters` sheet (§4.2). */
    templateExternalId: text('template_external_id'),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('characters_run_id_key').on(t.runId, t.id),
    unique('characters_run_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'characters_home_group_fk',
      columns: [t.runId, t.homeGroupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'characters_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)
