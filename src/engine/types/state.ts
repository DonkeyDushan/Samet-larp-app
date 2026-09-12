/** Run state at the start of a chapter — the first argument of `evaluate`. */
import type { BandId, ChapterNumber, CharacterId, FlagId, GroupId, HouseholdId, ScaleId } from './ids'

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

export interface RunState {
  runId: string
  chapter: ChapterNumber
  characters: Record<CharacterId, CharacterState>
  groups: Record<GroupId, GroupState>
  households: Record<HouseholdId, HouseholdState>
}
