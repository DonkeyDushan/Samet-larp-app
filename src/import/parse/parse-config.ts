/**
 * Workbook to `ParsedConfig` (§4.2, §10.2).
 *
 * The parser never throws on bad content and never stops at the first problem:
 * a broken config must not take the application down, and the author wants all
 * twenty typos in one round. Everything it cannot read becomes an issue and the
 * parse continues with what is left.
 */
import { buildAliases } from '../characters'
import {
  CHAPTER_SHEET_KINDS,
  CHAPTERS,
  chapterSheetName,
  CHARACTERS_SHEET,
  IGNORED_SHEETS,
  TEMPLATES_SHEET,
  VALIDATIONS_SHEET,
} from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { ParsedBlock } from '../types/parsed-block'
import type { ImportRepairs, ParsedConfig, Workbook } from '../types/parsed-config'
import type { ParsedQuestion } from '../types/parsed-question'
import type { ParsedScale } from '../types/parsed-scale'
import { collectGroups, parseCharacters } from './parse-characters'
import { parseContent } from './parse-content'
import { parseQuestions } from './parse-questions'
import { parseScales } from './parse-scales'
import { parseTemplateAssignments } from './parse-template-assignments'

export const parseConfig = (workbook: Workbook, issues: IssueCollector): ParsedConfig => {
  const repairs: ImportRepairs = {
    trimmedCells: 0,
    filledDownCells: 0,
    skippedEmptyRows: 0,
    resolvedCharacterNames: 0,
    droppedScaleStrategies: 0,
  }

  const characters = parseCharacters(workbook, issues, repairs)
  const groups = collectGroups(characters)
  const aliases = buildAliases(characters)

  const chapters = CHAPTERS.filter((chapter) =>
    CHAPTER_SHEET_KINDS.some((kind) => workbook.has(chapterSheetName(chapter, kind))),
  )

  const scales = new Map<number, ParsedScale[]>()
  const questions = new Map<number, ParsedQuestion[]>()
  const blocks = new Map<number, ParsedBlock[]>()

  for (const chapter of chapters) {
    scales.set(chapter, parseScales(workbook, chapter, issues, repairs))
    questions.set(chapter, parseQuestions(workbook, chapter, aliases, issues, repairs))
    blocks.set(chapter, parseContent(workbook, chapter, aliases, issues, repairs))
  }

  return {
    chapters: [...chapters],
    characters,
    groups,
    scales,
    questions,
    blocks,
    templateAssignments: parseTemplateAssignments(workbook, issues, repairs),
    sheetNames: [...workbook.keys()],
    repairs,
  }
}

/** Sheets the import does not read, so the report can say what it ignored. */
export const unknownSheets = (workbook: Workbook): string[] => {
  const known = new Set<string>([CHARACTERS_SHEET, VALIDATIONS_SHEET, TEMPLATES_SHEET, ...IGNORED_SHEETS])
  for (const chapter of CHAPTERS) {
    for (const kind of CHAPTER_SHEET_KINDS) known.add(chapterSheetName(chapter, kind))
  }

  return [...workbook.keys()].filter((name) => !known.has(name))
}
