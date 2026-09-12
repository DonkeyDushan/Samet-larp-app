/**
 * Reading the uploaded file into plain grids (§10.2).
 *
 * The primary path is one `.xlsx` with every sheet, downloaded from Google
 * Sheets via *Soubor → Stáhnout → Microsoft Excel*. Individual `.csv` files are
 * the fallback — one per sheet, which the UI offers second.
 *
 * Cells are read as formatted text (`raw: false`), so a number keeps the shape
 * the author typed and the row number in an error message matches the sheet.
 */
import * as XLSX from 'xlsx'
import type { Grid } from './sheet'
import type { Workbook } from './parse-config'

/** Reads an `.xlsx` buffer into sheet name to grid. */
export function readWorkbook(data: ArrayBuffer | Uint8Array): Workbook {
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

/**
 * Reads one `.csv` as a sheet. The sheet name comes from the filename, so
 * `2_Questions.csv` lands where the xlsx path would put its `2_Questions` tab.
 */
export function readCsvSheet(filename: string, text: string): { name: string; grid: Grid } {
  const sheet = XLSX.read(text, { type: 'string', raw: false }).Sheets['Sheet1']
  const grid = sheet
    ? (XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: true,
      }) as Grid)
    : []
  return { name: sheetNameFromFilename(filename), grid }
}

/** Combines several `.csv` uploads into one workbook. */
export function workbookFromCsvFiles(files: { filename: string; text: string }[]): Workbook {
  const sheets: Workbook = new Map()
  for (const file of files) {
    const { name, grid } = readCsvSheet(file.filename, file.text)
    sheets.set(name, grid)
  }
  return sheets
}

/**
 * `Konfigurace_Struktura_-_2_Content.csv` to `2_Content`: the export from
 * Google Sheets prefixes the document name and separates the tab with ` - `.
 */
export function sheetNameFromFilename(filename: string): string {
  const base = (filename.split('/').pop() ?? filename).replace(/\.csv$/i, '')
  const separated = base.split(/\s*-\s*|_-_/)
  return (separated.at(-1) ?? base).trim()
}
