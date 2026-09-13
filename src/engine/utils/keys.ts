/** Internal lookup keys; never part of the output. */
import { KEY_SEPARATOR } from '../constants/identifiers'
import type { CharacterId } from '../types/ids'
import type { RollInput } from '../types/input'
import type { EffectSource, ScaleOwner } from '../types/source'

export const joinKey = (...parts: (string | number | boolean)[]): string => parts.join(KEY_SEPARATOR)

export const sourceKey = (source: EffectSource): string => {
  if (source.kind === 'odpoved') return joinKey(source.kind, source.questionId, source.optionId)

  return joinKey(source.kind, source.ruleId, source.characterId)
}

export const ownerKey = (owner: ScaleOwner): string => {
  if (owner.kind === 'postava') return joinKey(owner.kind, owner.characterId)

  return joinKey(owner.kind, owner.householdId)
}

export const rollKey = (ownerKind: RollInput['ownerKind'], ownerId: string, characterId: CharacterId): string =>
  joinKey(ownerKind, ownerId, characterId)
