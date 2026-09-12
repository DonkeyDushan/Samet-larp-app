/**
 * Reading the uploaded file into plain grids (§10.2).
 *
 * The only accepted format is one `.xlsx` with every sheet, downloaded from
 * Google Sheets via *Soubor → Stáhnout → Microsoft Excel*.
 *
 * Cells are read as formatted text (`raw: false`), so a number keeps the shape
 * the author typed and the row number in an error message matches the sheet.
 */
import * as XLSX from 'xlsx'
import type { Grid } from './sheet'
import type { Workbook } from './types/parsed-config'

/** Reads an `.xlsx` buffer into sheet name to grid. */
export const readWorkbook = (data: ArrayBuffer | Uint8Array): Workbook => {
  const workbook = XLSX.read(data, { type: 'array', raw: false })
  const sheets: Workbook = new Map()

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: true,
    })
    sheets.set(name, grid.map((row) => row.map((cell) => (cell ?? '').toString())) as Grid)
  }

  return sheets
}
