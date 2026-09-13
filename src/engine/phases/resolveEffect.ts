import { DEFAULT_EFFECT_WEIGHT } from '../constants/effectDefaults'
import { VALUE_FROM_ANSWER } from '../constants/identifiers'
import { fail } from '../errors/engineInputError'
import type { CharacterRef, EffectDefinition, ResolvedEffect } from '../types/effect'
import type { CharacterId } from '../types/ids'

export interface EffectOwner {
  /** Answering character, or the character a rule is evaluated for. */
  characterId: CharacterId
  /** Character the chosen option names, for effects that take theirs from the answer (§7.3). */
  referencedCharacterId?: CharacterId
  numericValue?: number
  /** Option or rule, for the error. */
  subject: string
}

const resolveCharacter = (ref: CharacterRef | undefined, owner: EffectOwner): CharacterId => {
  if (ref === undefined) return owner.characterId
  if (ref.from === 'postava') return ref.characterId

  return owner.referencedCharacterId ?? fail('neznamy_odkaz', owner.subject, 'the option names no character')
}

export const resolveEffect = (effect: EffectDefinition, owner: EffectOwner): ResolvedEffect => {
  const characterId = resolveCharacter(effect.character, owner)

  switch (effect.kind) {
    case 'zmena_skaly': {
      const weight = effect.weight ?? DEFAULT_EFFECT_WEIGHT

      return { kind: effect.kind, characterId, scaleKey: effect.scaleKey, delta: effect.delta * weight, weight }
    }
    case 'nastaveni_skaly': {
      const value =
        effect.value === VALUE_FROM_ANSWER
          ? (owner.numericValue ?? fail('neplatna_odpoved', owner.subject, 'VALUE needs a numeric answer'))
          : effect.value

      return { kind: effect.kind, characterId, scaleKey: effect.scaleKey, value }
    }
    case 'priznak':
      return { kind: effect.kind, characterId, flagId: effect.flagId, value: effect.value }
    case 'domacnost_slouceni':
      return { kind: effect.kind, characterId, partnerId: resolveCharacter(effect.partner, owner) }
    case 'domacnost_rozdeleni':
      if (effect.partner === undefined) return { kind: effect.kind, characterId }

      return { kind: effect.kind, characterId, partnerId: resolveCharacter(effect.partner, owner) }
    case 'clenstvi':
      return { kind: effect.kind, characterId, groupId: effect.groupId, action: effect.action }
    case 'vedeni':
      return { kind: effect.kind, characterId, groupId: effect.groupId }
  }
}
