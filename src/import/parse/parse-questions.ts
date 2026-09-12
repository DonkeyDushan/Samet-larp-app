import type { CharacterAliases } from '../characters'
import {
  OTHER_ANSWER_MARKER,
  ORG_SOURCE_WORD,
  PLAYER_SOURCE_WORDS,
  QUESTION_TYPES,
  YES_WORDS,
} from '../constants/sheet-vocabulary'
import { chapterSheetName, QUESTION_COLUMNS, QUESTION_FILL_DOWN_COLUMNS } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import { parseScaleImpact } from '../scale-impact'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import type { ParsedAnswerOption, ParsedQuestion } from '../types/parsed-question'
import { splitList } from '../utils/split-list'
import { parseAnswerEffects } from './parse-answer-effects'
import { readConfigSheet, requireColumns } from './read-config-sheet'
import { resolveOwner, resolveReferencedCharacter } from './resolve-character-refs'

/** Question type used when the sheet's value is unknown; already reported as an error. */
const FALLBACK_QUESTION_TYPE: ParsedQuestion['type'] = 'text'

export const parseQuestions = (
  workbook: Workbook,
  chapter: number,
  aliases: CharacterAliases,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedQuestion[] => {
  const name = chapterSheetName(chapter, 'Questions')
  const read = readConfigSheet(workbook, name, repairs, QUESTION_FILL_DOWN_COLUMNS)
  if (!read) {
    issues.error(
      'chybejici_list',
      { sheet: name },
      `Kapitola ${chapter} má v souboru listy, ale chybí jí \`${name}\` s otázkami.`,
    )

    return []
  }
  if (!requireColumns(name, read.headers, QUESTION_COLUMNS, issues)) return []

  const questions: ParsedQuestion[] = []
  const byId = new Map<string, ParsedQuestion>()
  const seenAnswers = new Map<string, number>()

  for (const row of read.rows) {
    const questionId = row.get('Question ID')
    if (questionId === '') {
      issues.error(
        'odpoved_bez_otazky',
        row.at('Question ID'),
        `Řádek nepatří k žádné otázce — sloupec \`Question ID\` je prázdný i po doplnění sloučených buněk.`,
      )
      continue
    }

    let question = byId.get(questionId)
    if (!question) {
      const typeRaw = row.get('Typ')
      const type = parseQuestionType(typeRaw)
      if (!type) {
        issues.error(
          'chybejici_hodnota',
          row.at('Typ'),
          `Otázka \`${questionId}\` má neznámý typ „${typeRaw}" — čeká se ${QUESTION_TYPES.map((t) => `\`${t}\``).join(', ')}.`,
          { value: typeRaw },
        )
      }

      const sourceRaw = row.get('Zdroj')
      const source = sourceRaw === ORG_SOURCE_WORD ? 'org' : 'hrac'
      if (sourceRaw !== '' && sourceRaw !== ORG_SOURCE_WORD && !isPlayerWord(sourceRaw)) {
        issues.error(
          'chybejici_hodnota',
          row.at('Zdroj'),
          `Otázka \`${questionId}\` má neznámý zdroj „${sourceRaw}" — čeká se \`hráč\` nebo \`org\`.`,
          { value: sourceRaw },
        )
      }

      const characterRef = row.get('Character')
      question = {
        externalId: questionId,
        chapter,
        characterRef,
        characterId: resolveOwner(characterRef, aliases, repairs, row.at('Character'), `Otázka \`${questionId}\``, issues),
        ordinal: byId.size + 1,
        text: row.get('Text'),
        type: type ?? FALLBACK_QUESTION_TYPE,
        source,
        isPaired: isYes(row.get('Parova')),
        options: [],
        location: row.at('Question ID'),
      }
      byId.set(questionId, question)
      questions.push(question)

      if (question.characterRef === '') {
        issues.error('chybejici_hodnota', row.at('Character'), `Otázka \`${questionId}\` nemá postavu.`)
      }
      if (question.text === '') {
        issues.warn(
          'chybejici_hodnota',
          row.at('Text'),
          `Otázka \`${questionId}\` nemá text — v dotazníku bude prázdná.`,
        )
      }
    }

    const answerId = row.get('Answer ID')
    // A question row with no answer is only a problem if no other row brings
    // one; that is checked once the whole sheet is read.
    if (answerId === '') continue

    const previousAnswer = seenAnswers.get(answerId)
    if (previousAnswer !== undefined) {
      issues.error(
        'duplicitni_id',
        row.at('Answer ID'),
        `Odpověď \`${answerId}\` je v listu \`${name}\` dvakrát (poprvé na řádku ${previousAnswer}).`,
        { value: answerId },
      )
      continue
    }
    seenAnswers.set(answerId, row.rowNumber)

    const { impacts, problems } = parseScaleImpact(row.get('Scale Impact'))
    for (const problem of problems) {
      issues.error(
        'vadny_dopad_na_skalu',
        row.at('Scale Impact'),
        `Dopad na škálu „${problem.raw}" u odpovědi \`${answerId}\` se nedá přečíst: ${problem.detail}.`,
        { value: problem.raw },
      )
    }

    const option: ParsedAnswerOption = {
      externalId: answerId,
      label: row.get('Answer Text'),
      ordinal: question.options.length + 1,
      impacts,
      blocks: splitList(row.get('Blocks')),
      flags: splitList(row.get('Flags')),
      effects: parseAnswerEffects(row.get('Effects'), answerId, row.at('Effects'), issues),
      isOther: answerId.endsWith(OTHER_ANSWER_MARKER) || row.get('Answer Text') === OTHER_ANSWER_MARKER,
      location: row.at('Answer ID'),
    }
    option.referencedCharacter = resolveReferencedCharacter(option, aliases.ids)
    question.options.push(option)

    // `scale_direct` writes an absolute value; the target scale comes from the
    // impact column rather than a column of its own.
    if (question.type === 'scale_direct' && question.scaleKey === undefined) {
      const absolute = impacts.find((i) => i.mode === 'absolutni')
      if (absolute) question.scaleKey = absolute.scale
    }
  }

  for (const question of questions) {
    checkQuestionShape(question, issues)
  }

  return questions
}

/** Checks that need every answer row of the question to have been read. */
const checkQuestionShape = (question: ParsedQuestion, issues: IssueCollector): void => {
  if (question.options.length === 0) {
    issues.error(
      'otazka_bez_odpovedi',
      question.location,
      `Otázka \`${question.externalId}\` nemá žádnou odpověď.`,
      { value: question.externalId },
    )
  }
  if (question.type === 'scale_direct' && question.scaleKey === undefined) {
    issues.error(
      'vadny_dopad_na_skalu',
      question.location,
      `Otázka \`${question.externalId}\` je typu \`scale_direct\`, ale žádná její odpověď neurčuje škálu zápisem \`S_<Postava>_<Skala>=VALUE\`.`,
      { value: question.externalId },
    )
  }
  if (question.isPaired && question.type !== 'single' && question.type !== 'multi') {
    issues.error(
      'chybejici_hodnota',
      question.location,
      `Párová otázka \`${question.externalId}\` musí být typu \`single\` nebo \`multi\`, aby mohla odkázat na druhou postavu.`,
      { value: question.type },
    )
  }
}

const parseQuestionType = (raw: string): ParsedQuestion['type'] | undefined =>
  QUESTION_TYPES.find((type) => type === raw)

/** `hráč`, `hrac`, `Hráč` — the sheet is written by hand. */
const isPlayerWord = (value: string): boolean => PLAYER_SOURCE_WORDS.includes(value.toLowerCase())

const isYes = (value: string): boolean => YES_WORDS.includes(value.toLowerCase())
