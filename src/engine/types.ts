/**
 * Rules engine types (§7).
 *
 * The engine is a pure function, so this file imports nothing from `src/db`:
 * IDs are plain strings and structures are plain objects the caller assembles
 * from the DB (or writes by hand in a test).
 */

export type CharacterId = string
export type GroupId = string
export type ScaleId = string
export type BandId = string
export type FlagId = string
export type HouseholdId = string
export type QuestionId = string
export type AnswerOptionId = string
export type RuleId = string
/** Template block `{BLOK <ID>}` (§8.4). */
export type BlockId = string

export type ChapterNumber = 1 | 2 | 3

/** Thresholds and names always come from data, never from code (§4.1). */
export interface BandDefinition {
  id: BandId
  ordinal: number
  /** Inclusive bounds. */
  min: number
  max: number
  name: string
}

export interface ScaleDefinition {
  id: ScaleId
  key: string
  label: string
  min: number
  max: number
  /**
   * Who owns the value (§4.4). `domacnost` means the household holds it and
   * all members read and change the same one — it is never copied.
   */
  scope: 'postava' | 'domacnost'
  /**
   * Merge on marriage; household scales only. `otazka` means do NOT compute —
   * the value comes from an answer or from the org, which is how money works:
   * players decide themselves how much each partner contributed.
   */
  mergeStrategy?: 'soucet' | 'prumer' | 'vyssi' | 'otazka'
  /** Split on divorce or death; household scales only. */
  splitStrategy?: 'kopie' | 'polovina' | 'otazka'
  /** Ascending by `ordinal`. Need not cover the whole range. */
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
  /** Questions are per character; there is no shared set (§6.6). */
  characterId: CharacterId
  chapter: ChapterNumber
  type: 'bool' | 'single' | 'multi' | 'scale_direct' | 'text'
  ordinal: number
  text: string
  /**
   * Input source only, not a different mechanism (§6.7) — with one exception:
   * `scale_direct` from the org sets the value absolutely at the start of the
   * value phase (see `TracePhase`).
   */
  source: 'hrac' | 'org'
  /**
   * Paired question, i.e. marriage (§6.7). There is a single answer row, not
   * two mirrored ones, so the engine must not expect one from the other
   * character too.
   */
  isPaired: boolean
  /** Target scale for `scale_direct`. */
  scaleId?: ScaleId
  options: AnswerOptionDefinition[]
}

export interface AnswerOptionDefinition {
  id: AnswerOptionId
  externalId: string
  label: string
  /** Naming another character means a registry ID, never free text (§6.6). */
  referencedCharacterId?: CharacterId
  isOther: boolean
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
  scaleIds: ScaleId[]
}

/**
 * One condition, always structured and never parsed from text (§15).
 * An empty `characterId` means "the character currently being evaluated".
 */
export interface RuleCondition {
  /** Groups are always joined by `OR`. */
  groupIndex: number
  position: number
  /** Joins this condition to the previous one in the group; ignored on the first. */
  connector: 'AND' | 'OR'
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

/** One action of a rule or of an answer option (§7.1). */
export type Effect =
  | { kind: 'zmena_skaly'; characterId?: CharacterId; scaleId: ScaleId; delta: number; weight: number; usesDiceValue?: boolean }
  | { kind: 'nastaveni_skaly'; characterId?: CharacterId; scaleId: ScaleId; value: number }
  | { kind: 'pasmo'; characterId?: CharacterId; scaleId: ScaleId; bandId: BandId }
  | { kind: 'priznak'; characterId?: CharacterId; flagId: FlagId; value: boolean }
  | { kind: 'blok'; characterId?: CharacterId; blockId: BlockId }
  | {
      kind: 'clenstvi'
      characterId?: CharacterId
      /** Target taken from the character the chosen answer option refers to (§7.3). */
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
      groupId: GroupId
      action: 'pridat' | 'odebrat'
    }
  | {
      kind: 'vedeni'
      characterId?: CharacterId
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
      groupId: GroupId
      role: 'clen' | 'vedouci'
    }
  | { kind: 'tag'; characterId?: CharacterId; code: string; note?: string }
  | {
      kind: 'domacnost_slouceni'
      characterId?: CharacterId
      /** The partner: named, or taken from the character the answer refers to. */
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
    }
  | { kind: 'domacnost_rozdeleni'; characterId?: CharacterId }

/**
 * `CONDITION → EFFECT [priority, weight]`.
 *
 * `isExclusion` marks a rule that prevents an outcome. Exclusions always win
 * over assignment and are applied before any effects.
 */
export interface Rule {
  id: RuleId
  externalId: string
  name: string
  description?: string
  /** NULL in data means the rule applies in every chapter. */
  chapter?: ChapterNumber
  priority: number
  weight: number
  isExclusion: boolean
  isEnabled: boolean
  /** Without this flag, member effects on a shared scale add up (§4.4). */
  appliesOncePerHousehold: boolean
  /** Rule requires a dice roll with this many sides (§7.4). */
  diceSides?: number
  conditions: RuleCondition[]
  effects: Effect[]
}

/** Third argument of `evaluate`: rules plus everything needed to read them. */
export interface RuleSet {
  chapter: ChapterNumber
  rules: Rule[]
  scales: ScaleDefinition[]
  flags: FlagDefinition[]
  groups: GroupDefinition[]
  characters: CharacterDefinition[]
  questions: QuestionDefinition[]
}

export interface Membership {
  groupId: GroupId
  role: 'clen' | 'vedouci'
}

export interface CharacterState {
  characterId: CharacterId
  /** `postava`-scoped values only; shared ones live in `HouseholdState` (§4.4). */
  scales: Record<ScaleId, number>
  /** Derived from the value; kept for outputs and conditions. */
  bands: Record<ScaleId, BandId>
  flags: Record<FlagId, boolean>
  memberships: Membership[]
  /**
   * Always set — a single character is a household of one, so the engine has
   * no "no household" branch (§4.4).
   */
  householdId: HouseholdId
  /** Template variables: `{PRIJMENI}`, `{VEK}`, … (§8.8). */
  variables: Record<string, string>
}

/** Owner of shared values (§4.4). */
export interface HouseholdState {
  householdId: HouseholdId
  memberIds: CharacterId[]
  scales: Record<ScaleId, number>
  bands: Record<ScaleId, BandId>
}

export interface GroupState {
  groupId: GroupId
  leaderId?: CharacterId
  memberIds: CharacterId[]
}

/** First argument of `evaluate`: state at the start of the chapter. */
export interface RunState {
  runId: string
  chapter: ChapterNumber
  characters: Record<CharacterId, CharacterState>
  groups: Record<GroupId, GroupState>
  households: Record<HouseholdId, HouseholdState>
}

/**
 * A recorded answer. An answer absent from the list counts as missing — the
 * engine fills in nothing and the computation must not finish (§6.3).
 */
export interface AnswerInput {
  questionId: QuestionId
  characterId: CharacterId
  boolValue?: boolean
  numericValue?: number
  textValue?: string
  selectedOptionIds?: AnswerOptionId[]
  filledByOrg: boolean
}

/**
 * An already rolled die. The engine never rolls (§7.4); a missing roll blocks
 * the computation the same way a missing answer does.
 */
export interface DiceInput {
  ruleId: RuleId
  characterId: CharacterId
  sides: number
  value: number
}

/** Second argument of `evaluate`. */
export interface EvaluationInputs {
  answers: AnswerInput[]
  dice: DiceInput[]
}

/**
 * One contribution to a result. Carries labelled data, not a finished
 * sentence — the wording belongs to the UI and must be changeable without
 * recomputing.
 */
export interface TraceContribution {
  sourceKind: 'odpoved' | 'pravidlo' | 'hod' | 'pocatecni' | 'rucni'
  sourceId: string
  /** Readable source description, e.g. the answer `Karel` to `Q_Marie1_1`. */
  label: string
  /**
   * Which character the contribution came from. Required on shared scales
   * (§4.4): Marie's money can change because of Mirek's answer, and without
   * this there is no way to explain it.
   */
  characterId?: CharacterId
  /** Set on merge and split, where §4.4 requires both original values. */
  householdId?: HouseholdId
  /** Contribution to the numeric value, weight already applied. */
  delta?: number
  /** Source value — on a household merge, each of the two inputs. */
  value?: number
  weight?: number
}

/**
 * Fixed evaluation order (§7.3): collect answers, apply exclusions, structural
 * changes (households, marriages, membership, leadership), then values
 * (absolute `scale_direct` settings first, then scale and flag changes by
 * descending priority), then bands, then leftover conflicts.
 *
 * `strukturalni` must complete before `hodnotove`: a shared scale needs to know
 * its household members before contributions are summed into it. Evaluating a
 * marriage in between scale changes would make the result depend on rule order.
 */
export type TracePhase =
  | 'sber'
  | 'vylouceni'
  | 'strukturalni'
  | 'hodnotove'
  | 'pasma'
  | 'konflikty'

/**
 * Phase membership lives in data so an `evaluate` implementation cannot work
 * around it — the phase order is an invariant, not a detail (§7.3).
 */
export const STRUCTURAL_EFFECT_KINDS = [
  'domacnost_slouceni',
  'domacnost_rozdeleni',
  'clenstvi',
  'vedeni',
] as const

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
  id: string
  /** Trace is a sequence, not a set. */
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
  /** Set on shared-scale changes and on household merge/split (§4.4). */
  householdId?: HouseholdId

  subject: {
    kind: 'skala' | 'priznak' | 'blok' | 'skupina' | 'tag' | 'domacnost'
    id: string
    label: string
  }

  /** `before` is absent on blocks and tags. */
  before?: number | string | boolean | null
  after?: number | string | boolean | null

  /** Absent for the initial state and for manual edits. */
  ruleId?: RuleId
  ruleName?: string
  rulePriority?: number

  contributions: TraceContribution[]
  note?: string
}

/**
 * Two rules of equal priority produced opposite results. The engine does not
 * decide — it hands this to the UI for the org to resolve (§7.3).
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
  candidates: { ruleId: RuleId; ruleName: string; proposed: number | string | boolean }[]
}

/** Missing input — the computation cannot finish (§6.3). */
export interface MissingInput {
  kind: 'odpoved' | 'hod'
  characterId: CharacterId
  questionId?: QuestionId
  ruleId?: RuleId
  label: string
}

/**
 * Scale clamped at a bound (§4.1). Reported separately and written to the
 * audit log because it signals badly tuned weights.
 */
export interface ClampEvent {
  characterId?: CharacterId
  householdId?: HouseholdId
  scaleId: ScaleId
  rawValue: number
  clampedValue: number
  bound: 'min' | 'max'
}

/** Template block to keep; the rest are deleted (§8.2). */
export interface SelectedBlock {
  characterId?: CharacterId
  groupId?: GroupId
  blockId: BlockId
  ruleId?: RuleId
}

/** Flag for the org: "event X happened → pull document 42" (§8.7). */
export interface OutputTag {
  characterId?: CharacterId
  code: string
  note?: string
  ruleId?: RuleId
}

export interface EvaluateResult {
  /** The input state is not modified — the engine is pure. */
  state: RunState
  trace: TraceEntry[]
  /** Non-empty blocks confirming the computation (§7.3). */
  conflicts: Conflict[]
  /** Non-empty blocks running the computation at all (§6.3). */
  missingInputs: MissingInput[]
  clamps: ClampEvent[]
  selectedBlocks: SelectedBlock[]
  tags: OutputTag[]
}

/**
 * The engine's only entry point. Pure: same input, same output — randomness
 * enters only as an already rolled value in `inputs.dice`.
 */
export type EvaluateFn = (
  state: RunState,
  inputs: EvaluationInputs,
  ruleSet: RuleSet,
) => EvaluateResult
