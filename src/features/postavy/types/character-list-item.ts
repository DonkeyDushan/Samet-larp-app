import type { characters } from '@/db/schema'

export type CharacterListItem = Pick<typeof characters.$inferSelect, 'id' | 'externalId' | 'firstName' | 'lastName'> & {
  groupName: string | null
}
