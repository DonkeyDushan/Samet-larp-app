import { describe, expect, it } from 'vitest'
import { missingColumns, normalizeCell, readSheet } from './sheet'

describe('normalizeCell', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeCell('  S_Marie_Wealth+3  ')).toBe('S_Marie_Wealth+3')
    expect(normalizeCell('Srdce   party')).toBe('Srdce party')
  })

  it('turns the non-breaking space from Google Sheets into a plain one', () => {
    expect(normalizeCell('Srdce party')).toBe('Srdce party')
  })

  it('leaves diacritics alone', () => {
    expect(normalizeCell(' Balážová ')).toBe('Balážová')
  })

  it('maps empty-ish values to an empty string', () => {
    expect(normalizeCell(null)).toBe('')
    expect(normalizeCell(undefined)).toBe('')
    expect(normalizeCell('   ')).toBe('')
  })
})

describe('readSheet', () => {
  const contentGrid = [
    ['Character', 'Block ID', 'Variation ID', 'Priority'],
    ['Marie', 'B_Marie_2_Historie_1', 'V_A', '1'],
    ['', '', 'V_B', '2'],
    ['', '', 'V_C', '3'],
    ['Karel', 'B_Karel_2_Prace_1', 'V_D', '1'],
  ]

  it('fills merged cells down the group', () => {
    const { rows, repairs } = readSheet('2_Content', contentGrid, {
      fillDown: ['Character', 'Block ID'],
    })
    expect(rows.map((r) => r.get('Block ID'))).toEqual([
      'B_Marie_2_Historie_1',
      'B_Marie_2_Historie_1',
      'B_Marie_2_Historie_1',
      'B_Karel_2_Prace_1',
    ])
    expect(repairs.filledDownCells).toBe(4)
  })

  it('does not fill down columns that were not asked for', () => {
    const { rows } = readSheet('2_Content', contentGrid, { fillDown: ['Block ID'] })
    expect(rows[1]!.get('Character')).toBe('')
  })

  it('numbers rows as the author sees them, header being row 1', () => {
    const { rows } = readSheet('2_Content', contentGrid, { fillDown: ['Block ID'] })
    expect(rows.map((r) => r.rowNumber)).toEqual([2, 3, 4, 5])
  })

  it('locates a cell by spreadsheet address', () => {
    const { rows } = readSheet('2_Content', contentGrid)
    expect(rows[0]!.at('Priority')).toEqual({
      sheet: '2_Content',
      row: 2,
      column: 'Priority',
      cell: 'D2',
    })
  })

  it('skips fully empty rows and counts them', () => {
    const { rows, repairs } = readSheet('X', [
      ['A', 'B'],
      ['1', '2'],
      ['', ''],
      ['3', '4'],
    ])
    expect(rows).toHaveLength(2)
    expect(repairs.skippedEmptyRows).toBe(1)
  })

  it('stops carrying a merged value across a blank row', () => {
    const { rows } = readSheet(
      'X',
      [
        ['Block ID', 'Variation ID'],
        ['B_1', 'V_A'],
        ['', ''],
        ['', 'V_B'],
      ],
      { fillDown: ['Block ID'] },
    )
    expect(rows[1]!.get('Block ID')).toBe('')
  })

  it('counts trimmed cells so the report can mention them', () => {
    const { repairs } = readSheet('X', [
      ['A'],
      ['  hodnota  '],
    ])
    expect(repairs.trimmedCells).toBe(1)
  })

  it('keeps the first of two identically named columns', () => {
    const { headers, rows } = readSheet('X', [
      ['A', 'A'],
      ['prvni', 'druhy'],
    ])
    expect(headers).toEqual(['A'])
    expect(rows[0]!.get('A')).toBe('prvni')
  })

  it('trims header names too', () => {
    const { headers } = readSheet('X', [['  Block ID  ', 'Priority']])
    expect(headers).toEqual(['Block ID', 'Priority'])
  })
})

describe('missingColumns', () => {
  it('names the columns that are absent', () => {
    expect(missingColumns(['Character', 'Block ID'], ['Character', 'Priority'])).toEqual([
      'Priority',
    ])
  })
})
