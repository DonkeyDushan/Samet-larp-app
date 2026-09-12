import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './columns'
import { questionSource, questionType } from './enums'
import { characters } from './characters'
import { scales } from './scales'
import { chapters, runs } from './runs'

/**
 * Question (§6.1, §6.6). Questions are per character — there is no shared set,
 * hence the mandatory `character_id`.
 *
 * The questionnaire is flat: conditional sub-questions are deliberately out.
 *
 * `source` separates player questions from org ones (§6.7) — a different input
 * source, not a different mechanism: same types, same scale impacts, same
 * rules, one stream in the UI and one progress indicator.
 */
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Source ID `Q_<Postava>_<Kapitola>_<Poradi>`, e.g. `Q_Marie_1_1`. */
    externalId: text('external_id').notNull(),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    type: questionType('type').notNull(),
    /** Who fills it in (§6.7); `org` is not printed for players. */
    source: questionSource('source').notNull().default('hrac'),
    /**
     * Paired question (§6.7), typically marriage: it concerns two characters
     * but is entered once. The answer references the other character's ID and
     * the app shows it on both.
     *
     * So there is one answer row, not two mirrored ones. That removes a whole
     * class of conflicts — a mismatch cannot arise from a single answer.
     */
    isPaired: boolean('is_paired').notNull().default(false),
    text: text('text').notNull(),
    helpText: text('help_text'),
    /** Target scale for `scale_direct`. */
    scaleId: uuid('scale_id'),
    /** Allows `_OTHER_`: free text the org fills in by hand (§4.2). */
    allowOther: boolean('allow_other').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique('questions_run_id_key').on(t.runId, t.id),
    unique('questions_run_external_key').on(t.runId, t.externalId),
    unique('questions_character_ordinal_key').on(
      t.runId,
      t.chapterId,
      t.characterId,
      t.ordinal,
    ),
    // scale_direct must have a scale; no other type may.
    check(
      'questions_scale_direct_needs_scale',
      sql`(${t.type} = 'scale_direct') = (${t.scaleId} is not null)`,
    ),
    // A paired question must be able to reference the other character, which is
    // only possible through options carrying `referenced_character_id`.
    check(
      'questions_paired_needs_options',
      sql`not ${t.isPaired} or ${t.type} in ('single', 'multi')`,
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
  ],
)

/**
 * An answer option of a `single` / `multi` question (§4.2).
 *
 * Options often name other characters, and the reference must be a registry ID
 * rather than free text — otherwise a marriage or rename breaks the link
 * (§6.6). Hence `referencedCharacterId`.
 *
 * Scale impacts live in the `effects` table, not in a text column.
 */
export const answerOptions = pgTable(
  'answer_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>`, e.g. `A_Marie_1_1_Karel`. */
    externalId: text('external_id').notNull(),
    questionId: uuid('question_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    label: text('label').notNull(),
    /** Set when the option names another character. */
    referencedCharacterId: uuid('referenced_character_id'),
    /** The `_OTHER_` option: the org adds free text to it (§4.2). */
    isOther: boolean('is_other').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique('answer_options_run_id_key').on(t.runId, t.id),
    unique('answer_options_run_external_key').on(t.runId, t.externalId),
    unique('answer_options_question_ordinal_key').on(t.runId, t.questionId, t.ordinal),
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
 * A character's answer in a chapter (§6.3).
 *
 * There are no default answers: a row means someone entered it explicitly, and
 * a missing row blocks the computation. Nothing is ever filled in silently.
 *
 * The value is held per question type in `boolValue`, `numericValue` or
 * `textValue`; `single` / `multi` use `answer_selected_options`.
 *
 * Answers are edited in place (autosave, §6.4); `audit_log` holds the history.
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
    /** Free text for type `text`, or the text added to `_OTHER_`. */
    textValue: text('text_value'),

    /** Entered by the org, not the player (§6.3) — so it can be told apart later. */
    filledByOrg: boolean('filled_by_org').notNull().default(false),
    answeredBy: authorName('answered_by'),
    answeredAt: timestamp('answered_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('answers_unique').on(t.runId, t.chapterId, t.characterId, t.questionId),
    unique('answers_run_id_key').on(t.runId, t.id),
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

/** Selected options: one row for `single`, several for `multi`. */
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
    unique('answer_selected_options_unique').on(t.runId, t.answerId, t.answerOptionId),
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
