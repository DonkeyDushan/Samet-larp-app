/**
 * Trace — the data behind every "why" in the UI (architecture rule 1).
 *
 * Carries labelled data, not finished sentences: the wording belongs to the UI
 * and must be changeable without recomputing.
 */
import type { CharacterId, GroupId, HouseholdId, RuleId } from './ids'

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
