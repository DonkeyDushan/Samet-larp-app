/** Effects as the config declares them (§7.1) and as the engine applies them. */
import type { VALUE_FROM_ANSWER } from '../constants/identifiers'
import type { CharacterId, FlagId, GroupId, ScaleKey } from './ids'

/**
 * A character named outright, or whoever the chosen answer option names
 * (§7.3) — the second path spares the author a rule per pair of characters.
 */
export type CharacterRef =
  | { from: 'postava'; characterId: CharacterId }
  | { from: 'odpoved' }

/**
 * Layers 1, 2 and 4 share this shape, so answers and rules go through one code
 * path. An absent `character` means the owner: the answering character, or the
 * character a rule is evaluated for.
 */
export type EffectDefinition =
  | { kind: 'zmena_skaly'; character?: CharacterRef; scaleKey: ScaleKey; delta: number; weight?: number }
  | { kind: 'nastaveni_skaly'; character?: CharacterRef; scaleKey: ScaleKey; value: number | typeof VALUE_FROM_ANSWER }
  | { kind: 'priznak'; character?: CharacterRef; flagId: FlagId; value: boolean }
  | { kind: 'domacnost_slouceni'; character?: CharacterRef; partner: CharacterRef }
  | { kind: 'domacnost_rozdeleni'; character?: CharacterRef; partner?: CharacterRef }
  | { kind: 'clenstvi'; character?: CharacterRef; groupId: GroupId; action: 'pridat' | 'odebrat' }
  | { kind: 'vedeni'; character?: CharacterRef; groupId: GroupId }

/** An effect with every character and value settled, ready to apply. */
export type ResolvedEffect =
  | { kind: 'zmena_skaly'; characterId: CharacterId; scaleKey: ScaleKey; delta: number; weight: number }
  | { kind: 'nastaveni_skaly'; characterId: CharacterId; scaleKey: ScaleKey; value: number }
  | { kind: 'priznak'; characterId: CharacterId; flagId: FlagId; value: boolean }
  | { kind: 'domacnost_slouceni'; characterId: CharacterId; partnerId: CharacterId }
  | { kind: 'domacnost_rozdeleni'; characterId: CharacterId; partnerId?: CharacterId }
  | { kind: 'clenstvi'; characterId: CharacterId; groupId: GroupId; action: 'pridat' | 'odebrat' }
  | { kind: 'vedeni'; characterId: CharacterId; groupId: GroupId }
