/**
 * What an effect competes for. Two effects on one slot with different proposals
 * contradict each other; the higher priority wins, an equal one is a conflict.
 */
import type { ConflictSubject } from '../types/conflict'
import type { ResolvedEffect } from '../types/effect'
import type { CharacterId } from '../types/ids'
import { compareIds } from '../utils/compareIds'
import { joinKey } from '../utils/keys'

export interface Slot {
  key: string
  subject: ConflictSubject
  proposal: string
}

const pairKey = (a: CharacterId, b: CharacterId): string => joinKey(...[a, b].sort(compareIds))

/** An exclusion blocks every effect with the same key — the same outcome, whatever its source. */
export const exclusionKey = (effect: ResolvedEffect): string => {
  switch (effect.kind) {
    case 'zmena_skaly':
    case 'nastaveni_skaly':
      return joinKey(effect.kind, effect.characterId, effect.scaleKey)
    case 'priznak':
      return joinKey(effect.kind, effect.characterId, effect.flagId, effect.value)
    case 'domacnost_slouceni':
      return joinKey(effect.kind, pairKey(effect.characterId, effect.partnerId))
    case 'domacnost_rozdeleni':
      return joinKey(effect.kind, effect.characterId)
    case 'clenstvi':
      return joinKey(effect.kind, effect.groupId, effect.characterId, effect.action)
    case 'vedeni':
      return joinKey(effect.kind, effect.groupId, effect.characterId)
  }
}

const householdSlot = (characterId: CharacterId, proposal: string): Slot => ({
  key: joinKey('domacnost', characterId),
  subject: { kind: 'domacnost', characterId },
  proposal,
})

const membershipSlot = (groupId: string, characterId: CharacterId, proposal: string): Slot => ({
  key: joinKey('clenstvi', groupId, characterId),
  subject: { kind: 'clenstvi', groupId, characterId },
  proposal,
})

/**
 * A marriage claims both partners, so a character cannot marry twice or marry
 * and divorce in one chapter. Leadership also claims membership in the group.
 * Value effects claim nothing here.
 */
export const structuralSlots = (effect: ResolvedEffect): Slot[] => {
  switch (effect.kind) {
    case 'domacnost_slouceni': {
      const proposal = joinKey(effect.kind, pairKey(effect.characterId, effect.partnerId))

      return [householdSlot(effect.characterId, proposal), householdSlot(effect.partnerId, proposal)]
    }
    case 'domacnost_rozdeleni':
      return [householdSlot(effect.characterId, effect.kind)]
    case 'clenstvi':
      return [membershipSlot(effect.groupId, effect.characterId, effect.action)]
    case 'vedeni':
      return [
        { key: joinKey(effect.kind, effect.groupId), subject: { kind: 'vedeni', groupId: effect.groupId }, proposal: effect.characterId },
        membershipSlot(effect.groupId, effect.characterId, 'pridat'),
      ]
    default:
      return []
  }
}
