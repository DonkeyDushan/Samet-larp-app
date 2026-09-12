import { CHARACTER_COLUMNS, CHARACTERS_SHEET, INITIAL_SCALE_COLUMN_PREFIX } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { ParsedCharacter } from '../types/parsed-character'
import type { ImportRepairs, ParsedConfig, Workbook } from '../types/parsed-config'
import { readConfigSheet, requireColumns } from './read-config-sheet'

export const parseCharacters = (
  workbook: Workbook,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedCharacter[] => {
  const read = readConfigSheet(workbook, CHARACTERS_SHEET, repairs)
  if (!read) {
    issues.error(
      'chybejici_list',
      { sheet: CHARACTERS_SHEET },
      `V souboru chybí povinný list \`${CHARACTERS_SHEET}\` s registrem postav.`,
    )

    return []
  }
  if (!requireColumns(CHARACTERS_SHEET, read.headers, CHARACTER_COLUMNS, issues)) return []

  // Every `S_<Skala>` column holds a starting value for chapter 1 (§4.2).
  const scaleColumns = read.headers.filter((h) => h.startsWith(INITIAL_SCALE_COLUMN_PREFIX))
  if (scaleColumns.length === 0) {
    issues.warn(
      'chybejici_sloupec',
      { sheet: CHARACTERS_SHEET },
      'List `Characters` nemá žádný sloupec `S_<Skala>` s počátečními hodnotami škál pro kapitolu 1.',
    )
  }

  const characters: ParsedCharacter[] = []
  const seen = new Map<string, number>()

  for (const row of read.rows) {
    const externalId = row.get('Character ID')
    if (externalId === '') {
      issues.error(
        'chybejici_hodnota',
        row.at('Character ID'),
        'Řádek nemá `Character ID` — postava bez ID se nedá na nic navázat.',
      )
      continue
    }

    const previous = seen.get(externalId)
    if (previous !== undefined) {
      issues.error(
        'duplicitni_id',
        row.at('Character ID'),
        `Postava \`${externalId}\` je v listu dvakrát (poprvé na řádku ${previous}).`,
        { value: externalId },
      )
      continue
    }
    seen.set(externalId, row.rowNumber)

    const initialScales: ParsedCharacter['initialScales'] = {}
    for (const column of scaleColumns) {
      const raw = row.get(column)
      if (raw === '') continue

      const value = Number(raw)
      const key = column.slice(INITIAL_SCALE_COLUMN_PREFIX.length)
      if (!Number.isInteger(value)) {
        issues.error(
          'hodnota_mimo_rozsah',
          row.at(column),
          `Počáteční hodnota škály \`${key}\` u postavy \`${externalId}\` musí být celé číslo, je tam „${raw}".`,
          { value: raw },
        )
        continue
      }
      initialScales[key] = { value, location: row.at(column) }
    }

    characters.push({
      externalId,
      firstName: row.get('Jmeno'),
      lastName: row.get('Prijmeni'),
      groupName: row.get('Skupina'),
      templateExternalId: row.get('Template ID'),
      initialScales,
      location: row.at('Character ID'),
    })
  }

  return characters
}

/** Group names in order of first appearance. */
export const collectGroups = (characters: ParsedCharacter[]): ParsedConfig['groups'] => {
  const groups: ParsedConfig['groups'] = []
  const seen = new Set<string>()

  for (const character of characters) {
    if (character.groupName === '' || seen.has(character.groupName)) continue
    seen.add(character.groupName)
    groups.push({ name: character.groupName, location: character.location })
  }

  return groups
}
