import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import {
  conditionConnector,
  conditionOperator,
  conditionSubject,
  effectKind,
  groupRole,
  membershipAction,
} from './enums'
import { characters, groups } from './characters'
import { scaleBands, scales, flags } from './scales'
import { answerOptions, questions } from './questions'
import { chapters, runs } from './runs'

/**
 * A rule: `CONDITION → EFFECT [priority, weight]` (§7.1).
 *
 * `isExclusion` marks a rule that prevents an outcome ("if E and F, then D
 * never happens"). Exclusions always win over assignment and run in step 2 of
 * the fixed evaluation order (§7.3).
 *
 * On contradicting results the higher `priority` wins; on equal priority the
 * engine does not decide and raises a conflict into the UI.
 *
 * `chapterId = NULL` means the rule applies in every chapter of the run.
 */
export const rules = pgTable(
  'rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    externalId: text('external_id').notNull(),
    chapterId: uuid('chapter_id'),
    /** Short name for the UI and for the trace. */
    name: text('name').notNull(),
    /** Optional plain-language explanation for the org (§7.5). */
    description: text('description'),
    priority: integer('priority').notNull().default(0),
    /** Weight of the rule's contribution (§7.2). Edited in the spreadsheet, not in code. */
    weight: numeric('weight', { precision: 8, scale: 3 }).notNull().default('1'),
    isExclusion: boolean('is_exclusion').notNull().default(false),
    isEnabled: boolean('is_enabled').notNull().default(true),
    /**
     * Apply once per household (§4.4). Member effects on a shared scale normally
     * add up — both partners earn into the joint account. An event hitting the
     * household as a whole (burgled, granted a flat) would otherwise count once
     * per member; this flag stops that.
     */
    appliesOncePerHousehold: boolean('applies_once_per_household').notNull().default(false),
    /** Dice sides the rule requires (§7.4); NULL means no randomness. */
    diceSides: integer('dice_sides'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('rules_run_id_key').on(t.runId, t.id),
    unique('rules_run_external_key').on(t.runId, t.externalId),
    check('rules_dice_sides_positive', sql`${t.diceSides} is null or ${t.diceSides} >= 2`),
    foreignKey({
      name: 'rules_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
  ],
)

/**
 * One condition of a rule — structured, never text (§15). The columns mirror
 * the spec: subject | operator | value | connector | group.
 *
 * Rows sharing a `groupIndex` combine left to right through their `connector`
 * (which joins a row to the previous one and is ignored on the first); groups
 * are always joined by `OR`. So `(A AND B) OR C` is group 0: A, B(AND);
 * group 1: C.
 *
 * `negate` covers `NOT A` without a negated variant of every operator.
 *
 * The subject decides which reference is filled in: `odpoved` → questionId
 * (optionally answerOptionId), `skala` → scaleId, `pasmo` → scaleId + bandId,
 * `priznak` → flagId, `clenstvi` / `vedeni` → groupId, `hod` → none (it takes
 * its own rule's roll).
 */
export const ruleConditions = pgTable(
  'rule_conditions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    ruleId: uuid('rule_id').notNull(),
    /** The `Skupina` column from the source sheet; groups combine with OR. */
    groupIndex: integer('group_index').notNull().default(0),
    position: integer('position').notNull(),
    connector: conditionConnector('connector').notNull().default('AND'),
    negate: boolean('negate').notNull().default(false),

    subject: conditionSubject('subject').notNull(),
    operator: conditionOperator('operator').notNull(),

    questionId: uuid('question_id'),
    answerOptionId: uuid('answer_option_id'),
    scaleId: uuid('scale_id'),
    bandId: uuid('band_id'),
    flagId: uuid('flag_id'),
    groupId: uuid('group_id'),
    /** NULL means the character being evaluated; set for a specific other one. */
    characterId: uuid('character_id'),

    valueText: text('value_text'),
    valueNumber: integer('value_number'),
    valueBool: boolean('value_bool'),
    /** Values for `in` / `not_in`. */
    valueList: text('value_list').array(),

    createdAt: createdAt(),
  },
  (t) => [
    unique('rule_conditions_position_key').on(t.runId, t.ruleId, t.groupIndex, t.position),
    foreignKey({
      name: 'rule_conditions_rule_fk',
      columns: [t.runId, t.ruleId],
      foreignColumns: [rules.runId, rules.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'rule_conditions_question_fk',
      columns: [t.runId, t.questionId],
      foreignColumns: [questions.runId, questions.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'rule_conditions_option_fk',
      columns: [t.runId, t.answerOptionId],
      foreignColumns: [answerOptions.runId, answerOptions.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'rule_conditions_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'rule_conditions_band_fk',
      columns: [t.runId, t.bandId],
      foreignColumns: [scaleBands.runId, scaleBands.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'rule_conditions_flag_fk',
      columns: [t.runId, t.flagId],
      foreignColumns: [flags.runId, flags.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'rule_conditions_group_fk',
      columns: [t.runId, t.groupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'rule_conditions_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
  ],
)

/**
 * What happens (§7.1). The owner is either a rule or an answer option (the
 * scale-impact column from §4.2, `S_Marie_Wealth+3`). One table, because the
 * shape is identical in both cases and the engine handles them with one code
 * path; a CHECK enforces exactly one owner.
 *
 * `usesDiceValue` takes the magnitude from the roll stored in `dice_rolls`,
 * which is never re-rolled on recomputation (§7.4).
 */
export const effects = pgTable(
  'effects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),

    ruleId: uuid('rule_id'),
    answerOptionId: uuid('answer_option_id'),
    ordinal: integer('ordinal').notNull().default(0),

    /**
     * Deterministic ID derived from the owner and the ordinal
     * (`A_Marie_1_1_Karel#0`). Effects have no ID in the source sheet, but a
     * re-import has to update them rather than add a second copy.
     */
    externalId: text('external_id').notNull(),

    kind: effectKind('kind').notNull(),
    /** Effect weight (§7.2); the result is a sum of weighted contributions. */
    weight: numeric('weight', { precision: 8, scale: 3 }).notNull().default('1'),

    /** NULL means the character being computed. */
    characterId: uuid('character_id'),

    /** `zmena_skaly` / `nastaveni_skaly` / `pasmo`. */
    scaleId: uuid('scale_id'),
    scaleDelta: integer('scale_delta'),
    scaleSetValue: integer('scale_set_value'),
    bandId: uuid('band_id'),
    usesDiceValue: boolean('uses_dice_value').notNull().default(false),

    /** `priznak`. */
    flagId: uuid('flag_id'),
    flagValue: boolean('flag_value'),

    /** `blok`: template block ID, `{BLOK <ID>}` (§8.4). */
    blockExternalId: text('block_external_id'),

    /** `clenstvi` / `vedeni`. */
    groupId: uuid('group_id'),
    membershipAction: membershipAction('membership_action'),
    groupRole: groupRole('group_role'),

    /** `tag`: machine-readable signal for the org, "pull document 42" (§8.7). */
    tagCode: text('tag_code'),
    tagNote: text('tag_note'),

    /**
     * The effect's second character — a target derived from the answer (§7.3).
     * Needed by `domacnost_slouceni` (the spouse), `vedeni` (who became leader)
     * and `clenstvi` (who to add or remove).
     *
     * `relatedCharacterId` names the character outright; `relatedFromAnswer`
     * takes whoever the chosen option references
     * (`answer_options.referenced_character_id`). The second path is what saves
     * the author from writing a rule per pair of 23 characters.
     */
    relatedCharacterId: uuid('related_character_id'),
    relatedFromAnswer: boolean('related_from_answer').notNull().default(false),

    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('effects_run_id_key').on(t.runId, t.id),
    unique('effects_run_external_key').on(t.runId, t.externalId),
    check(
      'effects_exactly_one_owner',
      sql`(${t.ruleId} is not null) <> (${t.answerOptionId} is not null)`,
    ),
    check(
      'effects_scale_value_range',
      sql`${t.scaleSetValue} is null or ${t.scaleSetValue} between 1 and 10`,
    ),
    // The second character is named or derived, never both.
    check(
      'effects_related_single_source',
      sql`not (${t.relatedCharacterId} is not null and ${t.relatedFromAnswer})`,
    ),
    // A household merge cannot work without the second character.
    check(
      'effects_merge_needs_related',
      sql`${t.kind} <> 'domacnost_slouceni' or ${t.relatedCharacterId} is not null or ${t.relatedFromAnswer}`,
    ),
    foreignKey({
      name: 'effects_rule_fk',
      columns: [t.runId, t.ruleId],
      foreignColumns: [rules.runId, rules.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_option_fk',
      columns: [t.runId, t.answerOptionId],
      foreignColumns: [answerOptions.runId, answerOptions.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_related_character_fk',
      columns: [t.runId, t.relatedCharacterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_band_fk',
      columns: [t.runId, t.bandId],
      foreignColumns: [scaleBands.runId, scaleBands.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_flag_fk',
      columns: [t.runId, t.flagId],
      foreignColumns: [flags.runId, flags.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_group_fk',
      columns: [t.runId, t.groupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
  ],
)
