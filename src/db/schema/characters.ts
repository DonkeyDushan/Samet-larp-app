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
 * Skupina / organizace / parta (§4.1). 7 na běh.
 * Členy a vedení **nedrží tahle tabulka** — mění se po kapitolách,
 * a proto žijí v `group_memberships` jako snapshot na kapitolu.
 */
export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** ID ze zdrojové tabulky, např. `G_SrdceParty`. */
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
 * Postava v běhu (§4.2). Minimální registr — **nic navíc se o postavě
 * nemodeluje**: charakterizace žije v pevném textu šablony, ne v datech.
 *
 * `firstName` / `lastName` jsou **výchozí** hodnoty z konfigurace. Sňatek mění
 * příjmení, proto se do textů nikdy nepíše jméno natvrdo (§8.8) a aktuální
 * hodnota se bere z `character_variables` pro danou kapitolu.
 */
export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** ID z listu `Characters`, např. `Marie`. Vstupuje do konvence ID otázek. */
    externalId: text('external_id').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    /** Ročník, ze kterého se počítá `{VEK}` v každé kapitole. */
    birthYear: integer('birth_year'),
    /** Výchozí skupina z konfigurace. Aktuální členství je v `group_memberships`. */
    homeGroupId: uuid('home_group_id'),
    /** ID šablony dokumentu z listu `Characters` (§4.2). */
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
