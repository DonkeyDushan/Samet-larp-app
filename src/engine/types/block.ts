/** Blocks and their variations from `N_Content` (§8.2). */
import type { BlockId, ChapterNumber, CharacterId, VariationId } from './ids'

export interface VariationDefinition {
  id: VariationId
  /** Lower is evaluated first; the first variation whose condition holds wins. */
  priority: number
  /** The author's expression (§4.5), or `DEFAULT`. */
  condition: string
  /** May be empty — the "nothing happened" variation. */
  text: string
}

export interface BlockDefinition {
  id: BlockId
  chapter: ChapterNumber
  /** Owns unqualified flags in the conditions. */
  characterId: CharacterId
  variations: VariationDefinition[]
}
