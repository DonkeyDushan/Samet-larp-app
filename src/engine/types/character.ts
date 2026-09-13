/** Character registry entry (§4.2) — only what the engine computes with. */
import type { CharacterId, GroupId, ScaleKey } from './ids'

export interface CharacterDefinition {
  id: CharacterId
  /** Group from the `Characters` sheet; the starting membership. */
  groupId?: GroupId
  /**
   * Chapter-1 starting values (§4.2). A household scale's value seeds the
   * character's household of one.
   */
  initialScales: Record<ScaleKey, number>
}
