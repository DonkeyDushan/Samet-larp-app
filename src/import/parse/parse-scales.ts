import {
  BAND_SEPARATOR,
  HOUSEHOLD_SCOPE_WORDS,
} from '../constants/sheet-vocabulary'
import {
  COPY_SPLIT_STRATEGY,
  DEFAULT_SCALE_MAX,
  DEFAULT_SCALE_MIN,
  SHEET_COPY_SPLIT_STRATEGY,
} from '../constants/scale-defaults'
import { chapterSheetName, SCALE_COLUMNS } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { IssueLocation } from '../types/issue'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import type { ParsedBand, ParsedScale } from '../types/parsed-scale'
import { readConfigSheet, requireColumns } from './read-config-sheet'

/** `1-3` in the `Prahy` column. */
const BAND_RANGE = /^(\d+)\s*-\s*(\d+)$/

export const parseScales = (
  workbook: Workbook,
  chapter: number,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedScale[] => {
  const name = chapterSheetName(chapter, 'Scales')
  const read = readConfigSheet(workbook, name, repairs)
  if (!read) {
    issues.error(
      'chybejici_list',
      { sheet: name },
      `Kapitola ${chapter} má v souboru listy, ale chybí jí \`${name}\` s definicí škál.`,
    )

    return []
  }
  if (!requireColumns(name, read.headers, SCALE_COLUMNS, issues)) return []

  const scales: ParsedScale[] = []
  const seen = new Map<string, number>()

  for (const row of read.rows) {
    const key = row.get('Scale ID')
    if (key === '') {
      issues.error('chybejici_hodnota', row.at('Scale ID'), 'Řádek nemá `Scale ID`.')
      continue
    }

    const previous = seen.get(key)
    if (previous !== undefined) {
      issues.error(
        'duplicitni_id',
        row.at('Scale ID'),
        `Škála \`${key}\` je v listu \`${name}\` dvakrát (poprvé na řádku ${previous}).`,
        { value: key },
      )
      continue
    }
    seen.set(key, row.rowNumber)

    const scopeRaw = row.get('Rozsah')
    let scope: ParsedScale['scope'] = 'postava'
    if (HOUSEHOLD_SCOPE_WORDS.includes(scopeRaw)) {
      scope = 'domacnost'
    } else if (scopeRaw !== 'postava') {
      issues.error(
        'chybejici_hodnota',
        row.at('Rozsah'),
        `Škála \`${key}\` má neznámý rozsah platnosti „${scopeRaw}" — čeká se \`postava\` nebo \`domacnost\`.`,
        { value: scopeRaw },
      )
    }

    // Merge and split only mean something on a shared scale, and the database
    // rejects them elsewhere. The author fills the whole column out of habit,
    // so they are dropped quietly and counted for the import summary.
    let mergeStrategy = row.get('Slouceni') || undefined
    let splitStrategy = normalizeSplitStrategy(row.get('Rozdeleni'))
    if (scope === 'postava' && (mergeStrategy || splitStrategy)) {
      repairs.droppedScaleStrategies++
      mergeStrategy = undefined
      splitStrategy = undefined
    }

    scales.push({
      key,
      label: row.get('Nazev') || key,
      scope,
      min: integerOr(row.get('Min'), DEFAULT_SCALE_MIN),
      max: integerOr(row.get('Max'), DEFAULT_SCALE_MAX),
      bands: parseBands(row.get('Prahy'), row.get('Nazvy pasem'), key, row.at('Prahy'), issues),
      mergeStrategy,
      splitStrategy,
      location: row.at('Scale ID'),
    })
  }

  return scales
}

/** `1-3;4-5;6-8;9-10` paired with `Na dně;Vyžije;…` (§4.1). */
const parseBands = (
  thresholds: string,
  names: string,
  scaleKey: string,
  location: IssueLocation,
  issues: IssueCollector,
): ParsedBand[] => {
  if (thresholds === '') return []

  const ranges = thresholds.split(BAND_SEPARATOR).map((s) => s.trim()).filter((s) => s !== '')
  const labels = names.split(BAND_SEPARATOR).map((s) => s.trim())

  if (labels.length !== ranges.length) {
    issues.error(
      'chybejici_hodnota',
      location,
      `Škála \`${scaleKey}\` má ${ranges.length} pásem, ale ${labels.filter((l) => l !== '').length} názvů — počty musí sedět.`,
      { value: thresholds },
    )
  }

  const bands: ParsedBand[] = []
  ranges.forEach((range, index) => {
    const match = BAND_RANGE.exec(range)
    if (!match) {
      issues.error(
        'chybejici_hodnota',
        location,
        `Pásmo „${range}" škály \`${scaleKey}\` se nedá přečíst — čeká se tvar \`1-3\`.`,
        { value: range },
      )

      return
    }

    const min = Number(match[1])
    const max = Number(match[2])
    if (min > max) {
      issues.error(
        'hodnota_mimo_rozsah',
        location,
        `Pásmo „${range}" škály \`${scaleKey}\` má dolní hranici větší než horní.`,
        { value: range },
      )

      return
    }

    const ordinal = index + 1
    bands.push({ ordinal, min, max, name: labels[index] ?? `Pásmo ${ordinal}` })
  })

  return bands
}

/**
 * `kazdy_si_odnasi` is how the sheet spells the default split — each partner
 * takes the current household value, which is `kopie` in the data model (§4.4).
 */
const normalizeSplitStrategy = (raw: string): string | undefined => {
  if (raw === '') return undefined

  return raw === SHEET_COPY_SPLIT_STRATEGY ? COPY_SPLIT_STRATEGY : raw
}

/** An empty cell falls back too — `Number('')` would otherwise read as 0. */
const integerOr = (raw: string, fallback: number): number => {
  if (raw === '') return fallback

  const value = Number(raw)

  return Number.isInteger(value) ? value : fallback
}
