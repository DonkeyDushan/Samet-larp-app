/**
 * The shape the workbook is parsed into, before anything touches the database.
 *
 * Deliberately a plain data structure: parsing, validating and reporting all
 * work on it without a connection, so the whole import can be tested on
 * fixtures.
 */
import type { Grid } from '../sheet'
import type { IssueLocation } from './issue'
import type { ParsedBlock } from './parsed-block'
import type { ParsedCharacter } from './parsed-character'
import type { ParsedQuestion } from './parsed-question'
import type { ParsedScale } from './parsed-scale'

/** Sheets as the workbook presents them: name to grid. */
export type Workbook = Map<string, Grid>

/** What was quietly cleaned up, reported in the import summary. */
export interface ImportRepairs {
  trimmedCells: number
  filledDownCells: number
  skippedEmptyRows: number
  /** `Character` cells resolved from a name rather than a registry ID. */
  resolvedCharacterNames: number
  /** Merge/split strategies dropped from `postava` scales, where they mean nothing. */
  droppedScaleStrategies: number
}

export interface ParsedConfig {
  /** Chapter numbers the workbook actually carries. */
  chapters: number[]
  characters: ParsedCharacter[]
  /** Group names found in the `Characters` sheet, in order of first appearance. */
  groups: { name: string; location: IssueLocation }[]
  /** Scales per chapter. */
  scales: Map<number, ParsedScale[]>
  questions: Map<number, ParsedQuestion[]>
  blocks: Map<number, ParsedBlock[]>
  /** `Templates` sheet, when present: template ID to character. */
  templateAssignments: { externalId: string; characterRef: string; location: IssueLocation }[]
  sheetNames: string[]
  repairs: ImportRepairs
}
