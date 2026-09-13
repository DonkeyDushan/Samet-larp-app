import { AUTHOR_MAX_LENGTH } from '../constants/access'

/** Collapsed whitespace, `undefined` when empty or too long to be a name. */
export const normalizeAuthor = (value: string): string | undefined => {
  const author = value.replace(/\s+/g, ' ').trim()

  return author === '' || author.length > AUTHOR_MAX_LENGTH ? undefined : author
}
