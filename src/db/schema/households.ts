import { foreignKey, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './_shared'
import { chapters, runs } from './runs'

/**
 * Domácnost (§4.4) — postavy sdílející ekonomické hodnoty, typicky manželé.
 *
 * Sdílené hodnoty **nesmí být řešené kopírováním mezi postavami**, proto má
 * domácnost vlastní identitu a vlastní hodnoty škál (`household_scale_values`).
 *
 * Svobodná postava je technicky **domácnost o jednom členovi** — při založení
 * běhu vznikne jedna domácnost na každou postavu. Tím v enginu odpadá zvláštní
 * větev pro „postavu bez domácnosti".
 *
 * Identita domácnosti přežívá kapitoly; kdo v ní je, drží
 * `household_memberships` jako snapshot na kapitolu. Rozvod tedy nemaže
 * domácnost, jen v další kapitole vznikne jiné členství.
 */
export const households = pgTable(
  'households',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Generované ID, např. `H_Marie` nebo `H_Marie_Mirek`. */
    externalId: text('external_id').notNull(),
    /** Popis pro orga: „Balážová–Pokorný". Do dokumentů nevstupuje. */
    label: text('label'),
    /** Kapitola, ve které domácnost vznikla. */
    createdInChapterId: uuid('created_in_chapter_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('households_run_id_key').on(t.runId, t.id),
    unique('households_run_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'households_chapter_fk',
      columns: [t.runId, t.createdInChapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
  ],
)
