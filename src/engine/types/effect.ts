/** One action of a rule or of an answer option (§7.1). */
import type { BandId, BlockId, CharacterId, FlagId, GroupId, ScaleId } from './ids'

export type Effect =
  | { kind: 'zmena_skaly'; characterId?: CharacterId; scaleId: ScaleId; delta: number; weight: number; usesDiceValue?: boolean }
  | { kind: 'nastaveni_skaly'; characterId?: CharacterId; scaleId: ScaleId; value: number }
  | { kind: 'pasmo'; characterId?: CharacterId; scaleId: ScaleId; bandId: BandId }
  | { kind: 'priznak'; characterId?: CharacterId; flagId: FlagId; value: boolean }
  | { kind: 'blok'; characterId?: CharacterId; blockId: BlockId }
  | {
      kind: 'clenstvi'
      characterId?: CharacterId
      /** Target taken from the character the chosen answer option refers to (§7.3). */
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
      groupId: GroupId
      action: 'pridat' | 'odebrat'
    }
  | {
      kind: 'vedeni'
      characterId?: CharacterId
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
      groupId: GroupId
      role: 'clen' | 'vedouci'
    }
  | { kind: 'tag'; characterId?: CharacterId; code: string; note?: string }
  | {
      kind: 'domacnost_slouceni'
      characterId?: CharacterId
      /** The partner: named, or taken from the character the answer refers to. */
      relatedCharacterId?: CharacterId
      relatedFromAnswer?: boolean
    }
  | { kind: 'domacnost_rozdeleni'; characterId?: CharacterId }
