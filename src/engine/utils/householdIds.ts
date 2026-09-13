import { HOUSEHOLD_ID_PREFIX, HOUSEHOLD_ID_SEPARATOR } from '../constants/identifiers'
import type { ChapterNumber, CharacterId, HouseholdId } from '../types/ids'
import { compareIds } from './compareIds'

/** Every character starts in a household of one (§4.4). */
export const initialHouseholdId = (characterId: CharacterId): HouseholdId => `${HOUSEHOLD_ID_PREFIX}${characterId}`

/** The chapter keeps a later remarriage of the same pair from reusing the ID. */
export const mergedHouseholdId = (chapter: ChapterNumber, characterIds: CharacterId[]): HouseholdId =>
  HOUSEHOLD_ID_PREFIX + [String(chapter), ...[...characterIds].sort(compareIds)].join(HOUSEHOLD_ID_SEPARATOR)

export const splitHouseholdId = (chapter: ChapterNumber, characterId: CharacterId): HouseholdId =>
  HOUSEHOLD_ID_PREFIX + [String(chapter), characterId].join(HOUSEHOLD_ID_SEPARATOR)
