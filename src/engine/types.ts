/**
 * Typy enginu pravidel (§7).
 *
 * Engine je **čistá funkce** — bez databáze, bez sítě, bez Reactu, bez importů
 * z `app/`. Tenhle soubor proto neimportuje nic z `src/db`: ID jsou obyčejné
 * stringy a struktury jsou prosté objekty, které si volající poskládá z DB
 * (nebo v testu napíše rukou).
 *
 * Architektonické pravidlo 1: `evaluate(stav, odpovědi, pravidla) → { stav, trace }`.
 */

// ---------------------------------------------------------------------------
// Identifikátory
// ---------------------------------------------------------------------------

export type CharacterId = string
export type GroupId = string
export type ScaleId = string
export type BandId = string
export type FlagId = string
export type HouseholdId = string
export type QuestionId = string
export type AnswerOptionId = string
export type RuleId = string
/** ID bloku v šabloně, tedy `{BLOK <ID>}` (§8.4). */
export type BlockId = string

export type ChapterNumber = 1 | 2 | 3

// ---------------------------------------------------------------------------
// Konfigurace: co engine ví o světě
// ---------------------------------------------------------------------------

/** Pásmo škály. Prahy i název jsou vždy z dat, nikdy z kódu (§4.1). */
export interface BandDefinition {
  id: BandId
  ordinal: number
  /** Hranice včetně. */
  min: number
  max: number
  name: string
}

export interface ScaleDefinition {
  id: ScaleId
  key: string
  label: string
  /** Rozsah škály; v téhle hře vždy 1–10 (§4.1). */
  min: number
  max: number
  /**
   * Komu hodnota patří (§4.4). `domacnost` znamená, že hodnotu drží domácnost
   * a všichni její členové čtou a mění tutéž — nikdy se nekopíruje.
   */
  scope: 'postava' | 'domacnost'
  /**
   * Jak se hodnoty slévají při sňatku. Jen u `scope: 'domacnost'`.
   * `otazka` = **nedopočítávat**, hodnota přijde z odpovědi nebo od orga.
   * Tak je to u peněz: kolik kdo do společného vložil, si hráči rozehrávají sami.
   */
  mergeStrategy?: 'soucet' | 'prumer' | 'vyssi' | 'otazka'
  /** Jak se hodnota dělí při rozvodu nebo úmrtí. Jen u `scope: 'domacnost'`. */
  splitStrategy?: 'kopie' | 'polovina' | 'otazka'
  /** Vzestupně podle `ordinal`. Nemusí pokrývat celý rozsah beze zbytku. */
  bands: BandDefinition[]
}

export interface FlagDefinition {
  id: FlagId
  key: string
  label: string
}

export interface QuestionDefinition {
  id: QuestionId
  externalId: string
  /** Otázky jsou vlastní pro každou postavu (§6.6). */
  characterId: CharacterId
  chapter: ChapterNumber
  type: 'bool' | 'single' | 'multi' | 'scale_direct' | 'text'
  ordinal: number
  text: string
  /**
   * Kdo otázku vyplňuje (§6.7). Pro engine je to **jen jiný zdroj vstupu**,
   * ne jiný mechanismus — s jednou výjimkou: `scale_direct` od orga nastavuje
   * hodnotu absolutně na začátku hodnotové fáze (viz `TracePhase`).
   */
  source: 'hrac' | 'org'
  /**
   * Párová otázka (§6.7) — sňatek. V datech existuje **jedna odpověď**,
   * ne dvě zrcadlené; druhá postava ji vidí provázanou. Engine proto nesmí
   * čekat odpověď i u druhé postavy.
   */
  isPaired: boolean
  /** Cílová škála u typu `scale_direct`. */
  scaleId?: ScaleId
  options: AnswerOptionDefinition[]
}

export interface AnswerOptionDefinition {
  id: AnswerOptionId
  externalId: string
  label: string
  /** Volba jmenuje jinou postavu → odkaz na ID z registru, ne volný text (§6.6). */
  referencedCharacterId?: CharacterId
  isOther: boolean
  /** Dopady volby na škály a příznaky (sloupec dopadu z §4.2). */
  effects: Effect[]
}

export interface GroupDefinition {
  id: GroupId
  externalId: string
  name: string
}

export interface CharacterDefinition {
  id: CharacterId
  externalId: string
  firstName: string
  lastName: string
  birthYear?: number
  /** Které škály se u postavy sledují. */
  scaleIds: ScaleId[]
}

// ---------------------------------------------------------------------------
// Pravidla
// ---------------------------------------------------------------------------

/**
 * Dílčí podmínka. **Strukturovaná, nikdy text** — vlastní jazyk na výrazy
 * se v tomhle projektu nepíše (§15).
 *
 * `characterId` nevyplněné znamená „postava, která se právě vyhodnocuje".
 */
export interface RuleCondition {
  /** Skupina podmínek; skupiny se mezi sebou spojují vždy `OR`. */
  groupIndex: number
  /** Pořadí ve skupině. */
  position: number
  /** Spojka vůči **předchozí** podmínce ve skupině. U první se ignoruje. */
  connector: 'AND' | 'OR'
  /** Negace dílčí podmínky (`NOT A`). */
  negate: boolean

  subject: 'odpoved' | 'skala' | 'pasmo' | 'priznak' | 'clenstvi' | 'vedeni' | 'hod'
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'obsahuje'
    | 'je_pravda'
    | 'je_nepravda'

  characterId?: CharacterId
  questionId?: QuestionId
  answerOptionId?: AnswerOptionId
  scaleId?: ScaleId
  bandId?: BandId
  flagId?: FlagId
  groupId?: GroupId

  valueText?: string
  valueNumber?: number
  valueBool?: boolean
  valueList?: string[]
}

/** Jedna akce pravidla nebo volby odpovědi (§7.1). */
export type Effect =
  | { kind: 'zmena_skaly'; characterId?: CharacterId; scaleId: ScaleId; delta: number; weight: number; usesDiceValue?: boolean }
  | { kind: 'nastaveni_skaly'; characterId?: CharacterId; scaleId: ScaleId; value: number }
  | { kind: 'pasmo'; characterId?: CharacterId; scaleId: ScaleId; bandId: BandId }
  | { kind: 'priznak'; characterId?: CharacterId; flagId: FlagId; value: boolean }
  | { kind: 'blok'; characterId?: CharacterId; blockId: BlockId }
  | {
      kind: 'clenstvi'
      characterId?: CharacterId
      /** Koho přidat/odebrat, když to určuje odpověď (§7.3). */
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
      groupId: GroupId
      action: 'pridat' | 'odebrat'
    }
  | {
      kind: 'vedeni'
      characterId?: CharacterId
      /** Kdo se stal vedoucím, když to určuje odpověď (§7.3). */
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
      groupId: GroupId
      role: 'clen' | 'vedouci'
    }
  | { kind: 'tag'; characterId?: CharacterId; code: string; note?: string }
  /**
   * Sloučení domácností při sňatku (§4.4). Partner je buď jmenovaný,
   * nebo se bere z postavy, na kterou odkazuje vybraná volba odpovědi.
   */
  | {
      kind: 'domacnost_slouceni'
      characterId?: CharacterId
      /** Partner. Jmenovitě, nebo z postavy, na kterou odkazuje odpověď. */
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
    }
  /** Rozdělení domácnosti při rozvodu nebo úmrtí (§4.4). */
  | { kind: 'domacnost_rozdeleni'; characterId?: CharacterId }

/**
 * Pravidlo: `PODMÍNKA → EFEKT [priorita, váha]`.
 *
 * `isExclusion` je vyloučení („pokud E a zároveň F, pak D nikdy nenastane").
 * **Vyloučení má vždy přednost před přiřazením** a aplikuje se dřív než efekty.
 */
export interface Rule {
  id: RuleId
  externalId: string
  name: string
  description?: string
  /** NULL v datech → pravidlo platí ve všech kapitolách. */
  chapter?: ChapterNumber
  priority: number
  weight: number
  isExclusion: boolean
  isEnabled: boolean
  /**
   * „Aplikovat jednou za domácnost" (§4.4). Bez tohohle příznaku se efekty
   * členů na sdílenou škálu **sčítají**.
   */
  appliesOncePerHousehold: boolean
  /** Pravidlo si vyžádá hod kostkou o tolika stěnách (§7.4). */
  diceSides?: number
  conditions: RuleCondition[]
  effects: Effect[]
}

/** Třetí argument `evaluate` — pravidla plus všechno, co k jejich čtení patří. */
export interface RuleSet {
  chapter: ChapterNumber
  rules: Rule[]
  scales: ScaleDefinition[]
  flags: FlagDefinition[]
  groups: GroupDefinition[]
  characters: CharacterDefinition[]
  questions: QuestionDefinition[]
}

// ---------------------------------------------------------------------------
// Stav
// ---------------------------------------------------------------------------

export interface Membership {
  groupId: GroupId
  role: 'clen' | 'vedouci'
}

/** Stav postavy: škály, příznaky, členství, proměnné. Nic víc (§4.2). */
export interface CharacterState {
  characterId: CharacterId
  /**
   * Hodnoty škál s rozsahem `postava`. Sdílené škály tady **nejsou** —
   * leží v `HouseholdState`, aby se hodnota nekopírovala (§4.4).
   */
  scales: Record<ScaleId, number>
  /** Pásmo dopočítané z hodnoty; drží se kvůli výstupům a podmínkám. */
  bands: Record<ScaleId, BandId>
  flags: Record<FlagId, boolean>
  memberships: Membership[]
  /**
   * Domácnost postavy. Vždy vyplněná — svobodná postava je domácnost
   * o jednom členovi, takže engine nemá větev pro „bez domácnosti" (§4.4).
   */
  householdId: HouseholdId
  /** Proměnné do šablony: `{PRIJMENI}`, `{VEK}`, … (§8.8). */
  variables: Record<string, string>
}

/** Stav domácnosti — vlastník sdílených hodnot (§4.4). */
export interface HouseholdState {
  householdId: HouseholdId
  memberIds: CharacterId[]
  /** Hodnoty škál s rozsahem `domacnost`. */
  scales: Record<ScaleId, number>
  bands: Record<ScaleId, BandId>
}

export interface GroupState {
  groupId: GroupId
  leaderId?: CharacterId
  memberIds: CharacterId[]
}

/** První argument `evaluate` — stav na začátku kapitoly. */
export interface RunState {
  runId: string
  chapter: ChapterNumber
  characters: Record<CharacterId, CharacterState>
  groups: Record<GroupId, GroupState>
  households: Record<HouseholdId, HouseholdState>
}

// ---------------------------------------------------------------------------
// Vstupy
// ---------------------------------------------------------------------------

/**
 * Zadaná odpověď. Odpověď, která v seznamu **není**, je chybějící — engine
 * si nic nedomýšlí a přepočet se nesmí dokončit (§6.3).
 */
export interface AnswerInput {
  questionId: QuestionId
  characterId: CharacterId
  boolValue?: boolean
  numericValue?: number
  textValue?: string
  selectedOptionIds?: AnswerOptionId[]
  /** Odpověď vyklikal org, nepřišla od hráče (§6.3). */
  filledByOrg: boolean
}

/**
 * Už hozená kostka. Engine **nikdy nehodí sám** — dostane uloženou hodnotu
 * a pracuje s ní (§7.4). Chybějící hod u pravidla, které ho vyžaduje, je
 * blokující chybějící vstup, stejně jako chybějící odpověď.
 */
export interface DiceInput {
  ruleId: RuleId
  characterId: CharacterId
  sides: number
  value: number
}

/** Druhý argument `evaluate`. */
export interface EvaluationInputs {
  answers: AnswerInput[]
  dice: DiceInput[]
}

// ---------------------------------------------------------------------------
// Trace: podklad pro odpověď na „proč"
// ---------------------------------------------------------------------------

/**
 * Jeden příspěvek k výsledku. Z těchhle položek UI skládá větu typu
 * „Protože Marie odpověděla ‚Karel' na Q_Marie1_1 (+3 Wealth) a je členkou
 * Srdce party (−2 Regime), její Wealth vzrostl z 4 na 7 → pásmo ‚Zajištěná'."
 *
 * Trace nese **data s popisky, ne hotovou větu** — formulace je věc UI
 * a musí jít změnit bez přepočítávání.
 */
export interface TraceContribution {
  sourceKind: 'odpoved' | 'pravidlo' | 'hod' | 'pocatecni' | 'rucni'
  sourceId: string
  /** Čitelný popis zdroje: „odpověď ‚Karel' na Q_Marie1_1". */
  label: string
  /**
   * Od které postavy příspěvek přišel. **U sdílené škály povinné** (§4.4):
   * Mariiny peníze se mohou změnit kvůli Mirkově odpovědi a bez tohohle pole
   * to nejde vysvětlit — byl by to přesně ten black box, který §2 zakazuje.
   */
  characterId?: CharacterId
  /**
   * Domácnost, ze které příspěvek přišel. Vyplněné u sloučení a rozdělení,
   * kde §4.4 vyžaduje **uvést obě původní hodnoty**.
   */
  householdId?: HouseholdId
  /** Příspěvek k číselné hodnotě, už po vynásobení vahou. */
  delta?: number
  /** Původní hodnota zdroje — u sloučení domácností obě vstupní hodnoty. */
  value?: number
  weight?: number
}

/**
 * Fáze fixního pořadí vyhodnocení (§7.3):
 *
 * 1. `sber` — sběr všech odpovědí
 * 2. `vylouceni` — aplikace vyloučení (negací); má přednost před přiřazením
 * 3. `strukturalni` — vznik a zánik domácností, sňatky, členství a vedení skupin
 * 4. `hodnotove` — **nejprve absolutní nastavení** z organizátorských otázek
 *    `scale_direct` (§6.7), pak změny škál a příznaků podle priority sestupně
 * 5. `pasma` — vyhodnocení pásem na škálách
 * 6. `konflikty` — detekce a nahlášení zbylých konfliktů
 *
 * **Fáze `strukturalni` musí proběhnout celá před `hodnotove`.** Sdílená škála
 * potřebuje vědět, kdo do domácnosti patří, dřív než se do ní začnou sčítat
 * příspěvky. Kdyby se sňatek vyhodnotil až mezi změnami škál, výsledek by
 * závisel na pořadí pravidel — a to je přesně ten nedeterminismus, kterému
 * se vyhýbáme (§2, bod 3).
 */
export type TracePhase =
  | 'sber'
  | 'vylouceni'
  | 'strukturalni'
  | 'hodnotove'
  | 'pasma'
  | 'konflikty'

/**
 * Které druhy efektů patří do strukturální fáze (§7.3, krok 3).
 * Rozdělení je tady v datech, aby ho nešlo v implementaci `evaluate`
 * omylem obejít — pořadí fází je invariant, ne detail.
 */
export const STRUCTURAL_EFFECT_KINDS = [
  'domacnost_slouceni',
  'domacnost_rozdeleni',
  'clenstvi',
  'vedeni',
] as const

/** Které druhy efektů patří do hodnotové fáze (§7.3, krok 4). */
export const VALUE_EFFECT_KINDS = [
  'nastaveni_skaly',
  'zmena_skaly',
  'pasmo',
  'priznak',
  'blok',
  'tag',
] as const

export type StructuralEffectKind = (typeof STRUCTURAL_EFFECT_KINDS)[number]
export type ValueEffectKind = (typeof VALUE_EFFECT_KINDS)[number]

export interface TraceEntry {
  /** Stabilní ID záznamu v rámci jednoho přepočtu. */
  id: string
  /** Pořadí vzniku; trace je posloupnost, ne množina. */
  order: number
  phase: TracePhase
  kind:
    | 'zmena_skaly'
    | 'orez'
    | 'priznak'
    | 'pasmo'
    | 'blok'
    | 'clenstvi'
    | 'vedeni'
    | 'tag'
    | 'vylouceni'
    | 'konflikt'
    | 'domacnost_slouceni'
    | 'domacnost_rozdeleni'

  characterId?: CharacterId
  groupId?: GroupId
  /** Vyplněné u změn na sdílené škále a u vzniku/zániku domácnosti (§4.4). */
  householdId?: HouseholdId

  /** Čeho se změna týká — škála, příznak, blok, skupina, domácnost. */
  subject: {
    kind: 'skala' | 'priznak' | 'blok' | 'skupina' | 'tag' | 'domacnost'
    id: string
    label: string
  }

  /** Hodnota před a po. U bloků a tagů `before` chybí. */
  before?: number | string | boolean | null
  after?: number | string | boolean | null

  /** Pravidlo, které změnu způsobilo. Chybí u počátečního stavu a ruční úpravy. */
  ruleId?: RuleId
  ruleName?: string
  rulePriority?: number

  contributions: TraceContribution[]
  note?: string
}

// ---------------------------------------------------------------------------
// Výstupy, které blokují potvrzení
// ---------------------------------------------------------------------------

/**
 * Dvě pravidla se **stejnou** prioritou dala protichůdný výsledek. Engine to
 * nerozhoduje sám — vyhodí to do UI a nechá rozhodnout orga (§7.3).
 */
export interface Conflict {
  id: string
  characterId?: CharacterId
  householdId?: HouseholdId
  subject: {
    kind: 'skala' | 'priznak' | 'blok' | 'skupina' | 'domacnost'
    id: string
    label: string
  }
  priority: number
  /** Pravidla, která si navzájem odporují, a co každé chtělo. */
  candidates: { ruleId: RuleId; ruleName: string; proposed: number | string | boolean }[]
}

/** Chybějící vstup — přepočet nelze dokončit (§6.3). */
export interface MissingInput {
  kind: 'odpoved' | 'hod'
  characterId: CharacterId
  questionId?: QuestionId
  ruleId?: RuleId
  label: string
}

/**
 * Ořez škály na hranici (§4.1). Je to **signál špatně nastavených vah**,
 * proto se hlásí zvlášť a zapisuje do auditu, ne že by se jen tiše uřízl.
 */
export interface ClampEvent {
  /** Vyplněné u škály s rozsahem `postava`. */
  characterId?: CharacterId
  /** Vyplněné u sdílené škály (§4.4). */
  householdId?: HouseholdId
  scaleId: ScaleId
  rawValue: number
  clampedValue: number
  bound: 'min' | 'max'
}

/** Vybraný blok šablony — vstup pro naplnění dokumentu mazáním (§8.2). */
export interface SelectedBlock {
  characterId?: CharacterId
  groupId?: GroupId
  blockId: BlockId
  ruleId?: RuleId
}

/** Vlaječka pro orga: „nastala událost X → vytáhni dokument č. 42" (§8.7). */
export interface OutputTag {
  characterId?: CharacterId
  code: string
  note?: string
  ruleId?: RuleId
}

// ---------------------------------------------------------------------------
// Podpis funkce evaluate
// ---------------------------------------------------------------------------

export interface EvaluateResult {
  /** Nový stav. Vstupní stav se nemodifikuje — engine je čistý. */
  state: RunState
  /** Posloupnost všeho, co se stalo a proč (§7.5). */
  trace: TraceEntry[]
  /** Nevyřešené konflikty. Neprázdné = přepočet nelze potvrdit (§7.3). */
  conflicts: Conflict[]
  /** Chybějící odpovědi a hody. Neprázdné = přepočet nelze spustit (§6.3). */
  missingInputs: MissingInput[]
  /** Ořezy na hranicích škál — do auditu a jako varování autorovi. */
  clamps: ClampEvent[]
  /** Bloky, které v šabloně zůstanou; ostatní se smažou (§8.2). */
  selectedBlocks: SelectedBlock[]
  /** Tagy pro fyzické materiály mimo systém (§8.7). */
  tags: OutputTag[]
}

/**
 * Jediný vstupní bod enginu.
 *
 * Čistá funkce: stejný vstup = stejný výstup (§2, bod 3). Náhoda vstupuje
 * jen jako už hozená hodnota v `inputs.dice`.
 */
export type EvaluateFn = (
  state: RunState,
  inputs: EvaluationInputs,
  ruleSet: RuleSet,
) => EvaluateResult
