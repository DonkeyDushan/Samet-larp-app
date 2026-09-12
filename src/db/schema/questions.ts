import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './_shared'
import { questionType } from './enums'
import { characters } from './characters'
import { scales } from './scales'
import { chapters, configVersions, runs } from './runs'

/**
 * Otázka (§6.1, §6.6). **Otázky jsou vlastní pro každou postavu** — žádná
 * sdílená sada. 23 postav × ~3 otázky × 3 kapitoly ≈ 207 otázek na hru,
 * proto je `character_id` povinné.
 *
 * Dotazník je plochý: podmíněné podotázky se vědomě neimplementují.
 */
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** ID ze zdrojové tabulky: `Q_<Postava><Kapitola>_<Poradi>`, např. `Q_Marie1_1`. */
    externalId: text('external_id').notNull(),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    type: questionType('type').notNull(),
    text: text('text').notNull(),
    helpText: text('help_text'),
    /** Cílová škála u typu `scale_direct`. */
    scaleId: uuid('scale_id'),
    /** Povoluje volbu `_OTHER_` — volný text, který org doplní ručně (§4.2). */
    allowOther: boolean('allow_other').notNull().default(false),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('questions_run_id_key').on(t.runId, t.id),
    uniqueIndex('questions_run_external_key').on(t.runId, t.externalId),
    uniqueIndex('questions_character_ordinal_key').on(
      t.runId,
      t.chapterId,
      t.characterId,
      t.ordinal,
    ),
    // scale_direct musí mít škálu, ostatní typy ji mít nesmí.
    check(
      'questions_scale_direct_needs_scale',
      sql`(${t.type} = 'scale_direct') = (${t.scaleId} is not null)`,
    ),
    foreignKey({
      name: 'questions_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'questions_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'questions_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'questions_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Volba odpovědi u otázky typu `single` / `multi` (§4.2).
 *
 * Volby často odkazují na jiné postavy („Karel", „Mirek"). Odkaz musí jít na
 * **ID postavy z registru**, ne na volný text — jinak se po sňatku nebo
 * přejmenování rozpadne provázání (§6.6). Proto `referencedCharacterId`.
 *
 * Dopady na škály nejsou v textovém sloupci, ale v tabulce `effects`.
 */
export const answerOptions = pgTable(
  'answer_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>`, např. `A_Marie_1_1_Karel`. */
    externalId: text('external_id').notNull(),
    questionId: uuid('question_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    label: text('label').notNull(),
    /** Odkaz na postavu, když volba jmenuje jinou postavu. */
    referencedCharacterId: uuid('referenced_character_id'),
    /** Volba `_OTHER_`: org k ní doplní volný text (§4.2). */
    isOther: boolean('is_other').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('answer_options_run_id_key').on(t.runId, t.id),
    uniqueIndex('answer_options_run_external_key').on(t.runId, t.externalId),
    uniqueIndex('answer_options_question_ordinal_key').on(t.runId, t.questionId, t.ordinal),
    foreignKey({
      name: 'answer_options_question_fk',
      columns: [t.runId, t.questionId],
      foreignColumns: [questions.runId, questions.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answer_options_referenced_character_fk',
      columns: [t.runId, t.referencedCharacterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Odpověď postavy na otázku v kapitole (§6.3).
 *
 * **Výchozí odpovědi neexistují.** Řádek tady znamená, že odpověď někdo
 * explicitně zadal. Chybějící řádek = chybějící odpověď a přepočet nelze
 * spustit. Žádné tiché doplňování hodnot na pozadí. Nikdy.
 *
 * Hodnota se drží podle typu otázky: `boolValue`, `numericValue`, `textValue`,
 * u `single` / `multi` řádky v `answer_selected_options`.
 *
 * Odpověď se edituje na místě (autosave, §6.4); historii změn drží `audit_log`.
 */
export const answers = pgTable(
  'answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    questionId: uuid('question_id').notNull(),

    boolValue: boolean('bool_value'),
    numericValue: integer('numeric_value'),
    /** Volný text u typu `text` nebo doplnění k volbě `_OTHER_`. */
    textValue: text('text_value'),

    /**
     * Odpověď doplnil org, ne hráč (§6.3). Aby šlo po hře poznat,
     * co přišlo od hráče a co vyklikal game master.
     */
    filledByOrg: boolean('filled_by_org').notNull().default(false),
    answeredBy: authorName(),
    answeredAt: timestamp('answered_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('answers_unique').on(t.runId, t.chapterId, t.characterId, t.questionId),
    uniqueIndex('answers_run_id_key').on(t.runId, t.id),
    foreignKey({
      name: 'answers_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answers_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answers_question_fk',
      columns: [t.runId, t.questionId],
      foreignColumns: [questions.runId, questions.id],
    }).onDelete('restrict'),
  ],
)

/** Vybrané volby u otázek `single` (jeden řádek) a `multi` (víc řádků). */
export const answerSelectedOptions = pgTable(
  'answer_selected_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    answerId: uuid('answer_id').notNull(),
    answerOptionId: uuid('answer_option_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('answer_selected_options_unique').on(t.runId, t.answerId, t.answerOptionId),
    foreignKey({
      name: 'answer_selected_options_answer_fk',
      columns: [t.runId, t.answerId],
      foreignColumns: [answers.runId, answers.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answer_selected_options_option_fk',
      columns: [t.runId, t.answerOptionId],
      foreignColumns: [answerOptions.runId, answerOptions.id],
    }).onDelete('restrict'),
  ],
)
