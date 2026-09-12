import { COLUMN_ALPHABET_SIZE, FIRST_COLUMN_CHAR_CODE } from '../constants/spreadsheet'

/** Column index (0-based) to spreadsheet letter: 0 → `A`, 26 → `AA`. */
export const columnLetter = (index: number): string => {
  let n = index
  let out = ''
  do {
    out = String.fromCharCode(FIRST_COLUMN_CHAR_CODE + (n % COLUMN_ALPHABET_SIZE)) + out
    n = Math.floor(n / COLUMN_ALPHABET_SIZE) - 1
  } while (n >= 0)

  return out
}
