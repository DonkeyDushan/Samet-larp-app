/**
 * Turning a workbook sheet into rows the rest of the import can trust.
 *
 * The export from Google Sheets is messy in predictable ways: trailing spaces,
 * empty rows, and merged cells that leave `Character` and `Block ID` filled in
 * only on the first row of a group (§8.2). All of that is handled quietly here,
 * but every repair is counted so the import report can say what was cleaned up.
 */
import { columnLetter, type IssueLocation } from './issues'

/** A row with its original position, so every message can point at the sheet. */
export interface SheetRow {
  /** 1-based row number as the author sees it; the header is row 1. */
  rowNumber: number
  /** Values by column header. */
  values: Record<string, string>
  /** Locates a cell in this row for an issue message. */
  at(column: string): IssueLocation
  /** Trimmed value, or `''` when the column is absent or empty. */
  get(column: string): string
}

export interface SheetReadResult {
  rows: SheetRow[]
  /** Headers as found, in order. */
  headers: string[]
  /** Counts of the quiet repairs, for the import summary. */
  repairs: {
    trimmedCells: number
    filledDownCells: number
    skippedEmptyRows: number
  }
}

/** Raw grid: array of rows, each an array of cell strings. */
export type Grid = string[][]

/**
 * Normalises one cell: trims, collapses inner runs of whitespace, and turns the
 * non-breaking space Google Sheets likes to emit into an ordinary one.
 *
 * Diacritics are left untouched — they are legitimate content in IDs and names.
 */
export function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

export interface ReadSheetOptions {
  /** Columns whose value carries down from the first row of a merged group. */
  fillDown?: string[]
  /** A row is considered empty when every one of these is blank. */
  identityColumns?: string[]
}

/**
 * Reads a grid into rows keyed by header.
 *
 * Duplicate headers keep the first occurrence: a second column with the same
 * name is almost always a leftover, and silently overwriting would hide it.
 */
export function readSheet(
  sheetName: string,
  grid: Grid,
  options: ReadSheetOptions = {},
): SheetReadResult {
  const repairs = { trimmedCells: 0, filledDownCells: 0, skippedEmptyRows: 0 }
  const [headerRow = [], ...bodyRows] = grid

  const headers: string[] = []
  const headerIndex = new Map<string, number>()
  headerRow.forEach((rawHeader, index) => {
    const header = normalizeCell(rawHeader)
    if (header === '') return
    if (!headerIndex.has(header)) {
      headerIndex.set(header, index)
      headers.push(header)
    }
  })

  const fillDown = options.fillDown ?? []
  const carried = new Map<string, string>()
  const rows: SheetRow[] = []

  bodyRows.forEach((rawRow, bodyIndex) => {
    const rowNumber = bodyIndex + 2 // header is row 1
    const values: Record<string, string> = {}
    let anyValue = false

    for (const header of headers) {
      const raw = rawRow[headerIndex.get(header)!]
      const clean = normalizeCell(raw)
      if (raw !== undefined && raw !== null && String(raw) !== clean) repairs.trimmedCells++
      values[header] = clean
      if (clean !== '') anyValue = true
    }

    if (!anyValue) {
      repairs.skippedEmptyRows++
      // A blank row ends a merged group; carrying values across it would attach
      // variants to the wrong block.
      carried.clear()
      return
    }

    for (const header of fillDown) {
      if (!headerIndex.has(header)) continue
      if (values[header] !== '') {
        carried.set(header, values[header] ?? '')
      } else if (carried.has(header)) {
        values[header] = carried.get(header) ?? ''
        repairs.filledDownCells++
      }
    }

    rows.push(makeRow(sheetName, rowNumber, values, headerIndex))
  })

  return { rows, headers, repairs }
}

function makeRow(
  sheet: string,
  rowNumber: number,
  values: Record<string, string>,
  headerIndex: Map<string, number>,
): SheetRow {
  return {
    rowNumber,
    values,
    get: (column) => values[column] ?? '',
    at: (column) => {
      const index = headerIndex.get(column)
      return {
        sheet,
        row: rowNumber,
        column,
        cell: index === undefined ? undefined : `${columnLetter(index)}${rowNumber}`,
      }
    },
  }
}

/** Headers present in the sheet but not in the expected list — usually a rename. */
export function missingColumns(headers: string[], required: string[]): string[] {
  const present = new Set(headers)
  return required.filter((column) => !present.has(column))
}
