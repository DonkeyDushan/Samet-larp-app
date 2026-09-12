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
import { createdAt } from './_shared'
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
import { chapters, configVersions, runs } from './runs'

/**
 * Pravidlo: `PODMÍNKA → EFEKT [priorita, váha]` (§7.1).
 *
 * `isExclusion` je negace / vyloučení: „pokud nastalo E a zároveň F, pak D
 * nikdy nenastane". **Vyloučení má vždy přednost před přiřazením** a aplikuje
 * se v kroku 2 fixního pořadí vyhodnocení (§7.3).
 *
 * Při dvou protichůdných výsledcích vyhrává vyšší `priority`. Při **stejné**
 * prioritě engine nerozhoduje sám — vyhodí konflikt do UI.
 *
 * `chapterId = NULL` znamená pravidlo platné ve všech kapitolách běhu.
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
    /** Krátký název pro UI a pro trace („proč"). */
    name: text('name').notNull(),
    /** Volitelné vysvětlení pro orga, aby pravidlo šlo přečíst česky (§7.5). */
    description: text('description'),
    priority: integer('priority').notNull().default(0),
    /** Váha příspěvku pravidla (§7.2). Editovatelná v tabulce, ne v kódu. */
    weight: numeric('weight', { precision: 8, scale: 3 }).notNull().default('1'),
    isExclusion: boolean('is_exclusion').notNull().default(false),
    isEnabled: boolean('is_enabled').notNull().default(true),
    /**
     * Pravidlo si vyžádá hod kostkou o tolika stěnách (§7.4).
     * NULL = pravidlo náhodu nepoužívá.
     */
    diceSides: integer('dice_sides'),
    sourceConfigVersionId: uuid('source_config_version_id').notNull(),
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
    foreignKey({
      name: 'rules_config_version_fk',
      columns: [t.runId, t.sourceConfigVersionId],
      foreignColumns: [configVersions.runId, configVersions.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Dílčí podmínka pravidla — **strukturovaně, ne jako text** (§15).
 * Sloupce odpovídají zadání: `subjekt | operátor | hodnota | spojka | skupina`.
 * Vlastní jazyk na výrazy se nepíše nikdy.
 *
 * Vyhodnocení: řádky se stejným `groupIndex` se spojují svým `connector`
 * (spojka vůči **předchozímu** řádku ve skupině, u prvního řádku se ignoruje),
 * zleva doprava. Skupiny mezi sebou se spojují vždy `OR`.
 * Tedy `(A AND B) OR (C)` = skupina 0: A, B(AND); skupina 1: C.
 *
 * `negate` pokrývá `NOT A` bez nutnosti zavádět operátor pro každou negaci.
 *
 * Subjekt určuje, který odkaz je vyplněný:
 * `odpoved` → questionId (+ volitelně answerOptionId), `skala` → scaleId,
 * `pasmo` → scaleId + bandId, `priznak` → flagId,
 * `clenstvi` / `vedeni` → groupId, `hod` → nic (bere hod vlastního pravidla).
 */
export const ruleConditions = pgTable(
  'rule_conditions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    ruleId: uuid('rule_id').notNull(),
    /** „Skupina" ze zdrojové tabulky. Skupiny se spojují OR. */
    groupIndex: integer('group_index').notNull().default(0),
    /** Pořadí ve skupině. */
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
    /**
     * Postava, o které podmínka mluví. NULL = postava, která se právě
     * vyhodnocuje (běžný případ). Vyplněné = podmínka o konkrétní jiné postavě.
     */
    characterId: uuid('character_id'),

    /** Hodnota k porovnání. Textová i číselná, podle operátoru. */
    valueText: text('value_text'),
    valueNumber: integer('value_number'),
    valueBool: boolean('value_bool'),
    /** Seznam hodnot pro `in` / `not_in`. */
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
 * Efekt — co se stane (§7.1). Vlastníkem je **buď** pravidlo, **nebo** volba
 * odpovědi (sloupec dopadu na škály z §4.2, `S_Marie_Wealth+3`). Jedna tabulka
 * proto, že tvar efektu je v obou případech stejný a engine ho zpracovává
 * jedním kódem; CHECK vynutí právě jednoho vlastníka.
 *
 * `usesDiceValue` = velikost změny se bere z hozeného čísla (§7.4), které je
 * uložené v `dice_rolls` a při přepočtu se **neopakuje**.
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

    kind: effectKind('kind').notNull(),
    /** Váha efektu (§7.2); výsledek = součet vážených příspěvků. */
    weight: numeric('weight', { precision: 8, scale: 3 }).notNull().default('1'),

    /** Cílová postava. NULL = postava, které se přepočet týká. */
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

    /** `blok`: ID bloku v šabloně, `{BLOK <ID>}` (§8.4). */
    blockExternalId: text('block_external_id'),

    /** `clenstvi` / `vedeni`. */
    groupId: uuid('group_id'),
    membershipAction: membershipAction('membership_action'),
    groupRole: groupRole('group_role'),

    /** `tag`: strojově čitelný signál pro orga, „vytáhni dokument č. 42" (§8.7). */
    tagCode: text('tag_code'),
    tagNote: text('tag_note'),

    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      'effects_exactly_one_owner',
      sql`(${t.ruleId} is not null) <> (${t.answerOptionId} is not null)`,
    ),
    check(
      'effects_scale_value_range',
      sql`${t.scaleSetValue} is null or ${t.scaleSetValue} between 1 and 10`,
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
