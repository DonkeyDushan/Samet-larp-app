/** Character and group registry entries (§4.2). */
import type { CharacterId, GroupId, ScaleId } from './ids'

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
