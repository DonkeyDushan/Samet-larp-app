/** Run state after a chapter — the first argument and the main output of `evaluate`. */
import type { ChapterNumber, CharacterId, FlagId, GroupId, HouseholdId, ScaleKey } from './ids'

export interface CharacterState {
  characterId: CharacterId
  /**
   * Always set — a single character is a household of one, so the engine has
   * no "no household" branch (§4.4).
   */
  householdId: HouseholdId
  /** `postava` scales only; shared values live in the household (§4.4). */
  scales: Record<ScaleKey, number>
  /** Band ordinal per scale, derived from the value in phase 5. */
  bands: Record<ScaleKey, number>
  /** A flag once cleared stays `false`, so the trace can explain it. */
  flags: Record<FlagId, boolean>
}

/** Owner of shared values (§4.4). */
export interface HouseholdState {
  householdId: HouseholdId
  memberIds: CharacterId[]
  scales: Record<ScaleKey, number>
  bands: Record<ScaleKey, number>
}

export interface GroupState {
  groupId: GroupId
  memberIds: CharacterId[]
  leaderId?: CharacterId
}

export interface RunState {
  /** 0 is the initial state from config; `evaluate` computes the chapter after this one. */
  completedChapter: 0 | ChapterNumber
  characters: Record<CharacterId, CharacterState>
  households: Record<HouseholdId, HouseholdState>
  groups: Record<GroupId, GroupState>
}
