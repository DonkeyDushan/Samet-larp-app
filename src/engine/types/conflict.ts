/**
 * What the engine refuses to decide (§7.3). Any conflict blocks confirming the
 * computation; the org resolves it.
 */
import type { ResolvedEffect } from './effect'
import type { CharacterId, FlagId, GroupId, ScaleKey } from './ids'
import type { EffectSource, ScaleOwner } from './source'

/** The thing two effects compete for. */
export type ConflictSubject =
  | { kind: 'skala'; owner: ScaleOwner; scaleKey: ScaleKey }
  | { kind: 'priznak'; characterId: CharacterId; flagId: FlagId }
  | { kind: 'domacnost'; characterId: CharacterId }
  | { kind: 'clenstvi'; groupId: GroupId; characterId: CharacterId }
  | { kind: 'vedeni'; groupId: GroupId }

export interface ConflictCandidate {
  effect: ResolvedEffect
  sources: EffectSource[]
}

/**
 * Why a household value was left open: the strategy leaves it to an answer
 * (`otazka`), the result is not a whole number, or an input value is missing.
 */
export type PendingReason = 'otazka' | 'necele_cislo' | 'chybi_hodnota'

export type Conflict =
  | {
      /** Two different outcomes at the highest priority; nothing was applied. */
      kind: 'stejna_priorita'
      subject: ConflictSubject
      priority: number
      candidates: ConflictCandidate[]
    }
  | {
      /** A household scale ended the chapter without a value (§4.4: never compute silently). */
      kind: 'nedopocitano'
      owner: ScaleOwner
      scaleKey: ScaleKey
      reason: PendingReason
    }
  | {
      /** The structural change does not fit the state, e.g. marrying someone already married. */
      kind: 'strukturalni'
      reason: 'uz_v_domacnosti' | 'neni_v_domacnosti' | 'partner_jinde'
      effect: ResolvedEffect
      sources: EffectSource[]
    }
