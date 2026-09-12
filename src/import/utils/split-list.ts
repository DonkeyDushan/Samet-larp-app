import { LIST_SEPARATOR } from '../constants/sheet-vocabulary'

/** Splits a comma/semicolon list cell, dropping empty items. */
export const splitList = (cell: string): string[] => {
  const items: string[] = []
  for (const part of cell.split(LIST_SEPARATOR)) {
    const item = part.trim()
    if (item !== '') items.push(item)
  }

  return items
}
