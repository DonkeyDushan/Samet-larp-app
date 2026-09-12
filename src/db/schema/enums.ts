import { pgEnum } from 'drizzle-orm/pg-core'

/** Životní cyklus běhu (§3.2). */
export const runStatus = pgEnum('run_status', ['zalozen', 'aktivni', 'archivovan'])

/** Stavy kapitoly (§3.2). Žádný z nich není nevratný zámek. */
export const chapterStatus = pgEnum('chapter_status', ['rozpracovana', 'spocitana', 'vydana'])

/** Rozhodnutí orga o dotčené kapitole (kaskáda, §3.2). */
export const cascadeDecision = pgEnum('cascade_decision', ['prepocitat', 'ponechat'])

/** Typy otázek (§6.1). Podmíněné podotázky se vědomě neimplementují. */
export const questionType = pgEnum('question_type', [
  'bool',
  'single',
  'multi',
  'scale_direct',
  'text',
])

/** Nad čím podmínka pravidla mluví (§7.1, strukturovaně — žádný parser textu). */
export const conditionSubject = pgEnum('condition_subject', [
  'odpoved',
  'skala',
  'pasmo',
  'priznak',
  'clenstvi',
  'vedeni',
  'hod',
])

/** Operátor podmínky. */
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

/** Spojka podmínky se předchozí podmínkou ve stejné skupině. */
export const conditionConnector = pgEnum('condition_connector', ['AND', 'OR'])

/** Druh efektu (§7.1). */
export const effectKind = pgEnum('effect_kind', [
  'zmena_skaly',
  'nastaveni_skaly',
  'pasmo',
  'priznak',
  'blok',
  'clenstvi',
  'vedeni',
  'tag',
])

/** Akce nad členstvím ve skupině. */
export const membershipAction = pgEnum('membership_action', ['pridat', 'odebrat'])

/** Role ve skupině. */
export const groupRole = pgEnum('group_role', ['clen', 'vedouci'])

/** Odkud se vzala hodnota stavu postavy. */
export const stateSource = pgEnum('state_source', ['pocatecni', 'prepocet', 'rucni'])

/** Verze přepočtu vzniká buď enginem, nebo ruční úpravou mezivýstupu (§5, krok 6). */
export const computationKind = pgEnum('computation_kind', ['prepocet', 'rucni_uprava'])

/** Návrh = dry-run (§5, krok 4). Potvrzená verze je ta, ze které se generují dokumenty. */
export const computationStatus = pgEnum('computation_status', ['navrh', 'potvrzena'])

/** Typ šablony dokumentu (§8.6). */
export const templateKind = pgEnum('template_kind', [
  'postava',
  'skupina',
  'highlighty',
  'dotaznik',
])
