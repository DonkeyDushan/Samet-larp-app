/**
 * The shape the workbook is parsed into, before anything touches the database.
 *
 * Deliberately a plain data structure: parsing, validating and reporting all
 * work on it without a connection, so the whole import can be tested on
 * fixtures. Persisting it is a separate step that runs only once the
 * validations found no error.
 */
import type { ExpressionParse } from './expression'
import type { ScaleImpact } from './scale-impact'
import type { IssueLocation } from './issues'

/** Every parsed record remembers where it came from, for error messages. */
interface Sourced {
  location: IssueLocation
}

export interface ParsedCharacter extends Sourced {
  externalId: string
  firstName: string
  lastName: string
  groupName: string
  templateExternalId: string
  /** Starting values for chapter 1, keyed by scale key (§4.2). */
  initialScales: Record<string, { value: number; location: IssueLocation }>
}

export interface ParsedBand {
  ordinal: number
  min: number
  max: number
  name: string
}

export interface ParsedScale extends Sourced {
  key: string
  label: string
  scope: 'postava' | 'domacnost'
  min: number
  max: number
  bands: ParsedBand[]
  mergeStrategy?: string
  splitStrategy?: string
}

/** One of `SNATEK(Mirek)`, `VEDENI(...)`, `CLENSTVI(...)` from the `Effects` column. */
export interface ParsedAnswerEffect {
  name: string
  argument: string
  raw: string
}

export interface ParsedAnswerOption extends Sourced {
  externalId: string
  label: string
  ordinal: number
  /** `Scale Impact`, already parsed (§4.2). */
  impacts: ScaleImpact[]
  /** `Blocks`: blocks this answer switches on (layer 2). */
  blocks: string[]
  /** `Flags`: flags this answer sets (layer 2). */
  flags: string[]
  /** `Effects`: structural effects (layer 2). */
  effects: ParsedAnswerEffect[]
  /** Character the option names, resolved from the ID suffix or from `SNATEK(…)`. */
  referencedCharacter?: string
  isOther: boolean
}

export interface ParsedQuestion extends Sourced {
  externalId: string
  chapter: number
  /** What the author typed in the `Character` column. */
  characterRef: string
  /** Registry ID it resolved to; undefined when nothing matched. */
  characterId?: string
  ordinal: number
  text: string
  type: 'bool' | 'single' | 'multi' | 'scale_direct' | 'text'
  source: 'hrac' | 'org'
  isPaired: boolean
  /** Target scale key for `scale_direct`, taken from the impact column. */
  scaleKey?: string
  options: ParsedAnswerOption[]
}

export interface ParsedVariation extends Sourced {
  externalId: string
  priority: number
  description: string
  text: string
  condition: ExpressionParse
}

export interface ParsedBlock extends Sourced {
  externalId: string
  chapter: number
  characterRef: string
  characterId?: string
  variations: ParsedVariation[]
}

/** A `.md` template uploaded alongside the workbook (§10.3). */
export interface ParsedTemplate {
  externalId: string
  filename: string
  markdown: string
  blockIds: string[]
  variables: string[]
  problems: { line: number; raw: string; detail: string }[]
}

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
