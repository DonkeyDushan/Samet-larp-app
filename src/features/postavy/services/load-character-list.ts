import { forRun } from '@/db'
import { characters, groups } from '@/db/schema'
import { APP_LOCALE } from '@/locales/app-locale'
import type { CharacterListItem } from '../types/character-list-item'

const collator = new Intl.Collator(APP_LOCALE)

/** Orgs call characters by first name (`Marie`), as the sheet IDs do. */
const byName = (a: CharacterListItem, b: CharacterListItem): number =>
  collator.compare(a.firstName, b.firstName) || collator.compare(a.lastName, b.lastName)

export const loadCharacterList = async (runId: string): Promise<CharacterListItem[]> => {
  const scope = forRun(runId)
  const [characterRows, groupRows] = await Promise.all([
    scope.selectColumns(characters, {
      id: characters.id,
      externalId: characters.externalId,
      firstName: characters.firstName,
      lastName: characters.lastName,
      homeGroupId: characters.homeGroupId,
    }),
    scope.selectColumns(groups, { id: groups.id, name: groups.name }),
  ])

  const groupNames = new Map(groupRows.map((group) => [group.id, group.name]))

  const items: CharacterListItem[] = []
  for (const character of characterRows) {
    items.push({
      id: character.id,
      externalId: character.externalId,
      firstName: character.firstName,
      lastName: character.lastName,
      groupName: character.homeGroupId ? (groupNames.get(character.homeGroupId) ?? null) : null,
    })
  }

  return items.sort(byName)
}
