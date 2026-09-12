import { pgEnum } from 'drizzle-orm/pg-core'

/** Run lifecycle (§3.2). */
export const runStatus = pgEnum('run_status', ['zalozen', 'aktivni', 'archivovan'])

/** Chapter states (§3.2). None of them is an irreversible lock. */
export const chapterStatus = pgEnum('chapter_status', ['rozpracovana', 'spocitana', 'vydana'])

/** Org's decision about a touched chapter (cascade, §3.2). */
export const cascadeDecision = pgEnum('cascade_decision', ['prepocitat', 'ponechat'])

/** Question types (§6.1). Conditional sub-questions are deliberately out. */
export const questionType = pgEnum('question_type', [
  'bool',
  'single',
  'multi',
  'scale_direct',
  'text',
])

/** What a rule condition talks about (§7.1) — structured, never parsed from text. */
export const conditionSubject = pgEnum('condition_subject', [
  'odpoved',
  'skala',
  'pasmo',
  'priznak',
  'clenstvi',
  'vedeni',
  'hod',
])

/** Condition operator. */
export const conditionOperator = pgEnum('condition_operator', [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'obsahuje',
  'je_pravda',
  'je_nepravda',
])

/** Joins a condition to the previous one in the same group. */
export const conditionConnector = pgEnum('condition_connector', ['AND', 'OR'])

/** Effect kind (§7.1, §4.4). */
export const effectKind = pgEnum('effect_kind', [
  'zmena_skaly',
  'nastaveni_skaly',
  'pasmo',
  'priznak',
  'blok',
  'clenstvi',
  'vedeni',
  'tag',
  'domacnost_slouceni',
  'domacnost_rozdeleni',
])

/**
 * Scale ownership (§4.4). `postava`: the value belongs to one character
 * (`Regime`, `Control`). `domacnost`: it belongs to the household and every
 * member reads and changes the same one (`Wealth`, `Bony`, company flat, car).
 */
export const scaleScope = pgEnum('scale_scope', ['postava', 'domacnost'])

/**
 * Merge on marriage (§4.4); the default is a sum clamped at 10.
 *
 * `otazka` means compute nothing — the value comes from an answer or from the
 * org. That is how money works: players decide themselves how much each
 * partner contributed, and a silent sum would take that away from them.
 */
export const mergeStrategy = pgEnum('merge_strategy', [
  'soucet',
  'prumer',
  'vyssi',
  'otazka',
])

/**
 * Split on divorce or death (§4.4). Default `kopie`: each takes the current
 * household value. `otazka`: an answer or the org decides — never a silent
 * computation.
 */
export const splitStrategy = pgEnum('split_strategy', ['kopie', 'polovina', 'otazka'])

/**
 * Who fills the question in (§6.7). `org` is not printed into the player's
 * questionnaire; otherwise it behaves identically — a different input source,
 * not a different mechanism, and the engine does not tell them apart.
 */
export const questionSource = pgEnum('question_source', ['hrac', 'org'])

/** Group membership action. */
export const membershipAction = pgEnum('membership_action', ['pridat', 'odebrat'])

/** Role in a group. */
export const groupRole = pgEnum('group_role', ['clen', 'vedouci'])

/** Where a character state value came from. */
export const stateSource = pgEnum('state_source', ['pocatecni', 'prepocet', 'rucni'])

/** A computation version comes from the engine or from a manual edit (§5.6). */
export const computationKind = pgEnum('computation_kind', ['prepocet', 'rucni_uprava'])

/** `navrh` is a dry-run (§5.4); documents are generated from a confirmed one. */
export const computationStatus = pgEnum('computation_status', ['navrh', 'potvrzena'])

/** Document template kind (§8.6). */
export const templateKind = pgEnum('template_kind', [
  'postava',
  'skupina',
  'highlighty',
  'dotaznik',
])
