/**
 * Workbook to `ParsedConfig` (§4.2, §10.2).
 *
 * The parser never throws on bad content and never stops at the first problem:
 * a broken config must not take the application down, and the author wants all
 * twenty typos in one round. Everything it cannot read becomes an issue and the
 * parse continues with what is left.
 */
import { buildAliases, resolveCharacter, type CharacterAliases } from './characters'
import { parseCondition } from './expression'
import { columnLetter, IssueCollector, type IssueLocation } from './issues'
import { parseScaleImpact } from './scale-impact'
import { missingColumns, readSheet, type Grid } from './sheet'
import type {
  ParsedAnswerEffect,
  ParsedAnswerOption,
  ParsedBand,
  ParsedBlock,
  ParsedCharacter,
  ParsedConfig,
  ParsedQuestion,
  ParsedScale,
  ParsedVariation,
} from './types'

/** Sheets as the workbook presents them: name to grid. */
export type Workbook = Map<string, Grid>

export const CHAPTERS = [1, 2, 3] as const

const CHARACTERS_SHEET = 'Characters'
const CHARACTER_COLUMNS = ['Character ID', 'Jmeno', 'Prijmeni', 'Skupina', 'Template ID']
const SCALE_COLUMNS = ['Scale ID', 'Nazev', 'Rozsah', 'Prahy', 'Nazvy pasem']
const QUESTION_COLUMNS = ['Question ID', 'Character', 'Text', 'Typ', 'Answer ID', 'Answer Text']
const CONTENT_COLUMNS = ['Character', 'Block ID', 'Variation ID', 'Variation Text', 'Priority', 'Conditions']

/** Sheets that are documentation, not data. */
const IGNORED_SHEETS = new Set(['Legend', 'Legenda'])

const QUESTION_TYPES = new Set(['bool', 'single', 'multi', 'scale_direct', 'text'])
/** Structural effects an answer may carry directly (layer 2). */
const ANSWER_EFFECTS = new Set(['SNATEK', 'ROZVOD', 'VEDENI', 'CLENSTVI', 'ODCHOD'])

export function parseConfig(workbook: Workbook, issues: IssueCollector): ParsedConfig {
  const sheetNames = [...workbook.keys()]
  const repairs = {
    trimmedCells: 0,
    filledDownCells: 0,
    skippedEmptyRows: 0,
    resolvedCharacterNames: 0,
    droppedScaleStrategies: 0,
  }

  const characters = parseCharacters(workbook, issues, repairs)
  const groups = collectGroups(characters)
  const aliases = buildAliases(characters)

  const chapters = CHAPTERS.filter((n) =>
    ['Questions', 'Scales', 'Content'].some((kind) => workbook.has(`${n}_${kind}`)),
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
    templateAssignments: parseTemplateSheet(workbook, issues, repairs),
    sheetNames,
    repairs,
  }
}

/** Sheets the import looked at, so the report can say what it ignored. */
export function unknownSheets(workbook: Workbook): string[] {
  const known = new Set<string>([CHARACTERS_SHEET, 'Validations', 'Templates', ...IGNORED_SHEETS])
  for (const n of CHAPTERS) {
    known.add(`${n}_Questions`)
    known.add(`${n}_Scales`)
    known.add(`${n}_Content`)
  }
  return [...workbook.keys()].filter((name) => !known.has(name))
}

type Repairs = ParsedConfig['repairs']

/** Reads a sheet, folding its repair counts into the running total. */
function sheet(
  workbook: Workbook,
  name: string,
  repairs: Repairs,
  fillDown: string[] = [],
) {
  const grid = workbook.get(name)
  if (!grid) return undefined
  const result = readSheet(name, grid, { fillDown })
  repairs.trimmedCells += result.repairs.trimmedCells
  repairs.filledDownCells += result.repairs.filledDownCells
  repairs.skippedEmptyRows += result.repairs.skippedEmptyRows
  return result
}

function requireColumns(
  sheetName: string,
  headers: string[],
  required: string[],
  issues: IssueCollector,
): boolean {
  const missing = missingColumns(headers, required)
  for (const column of missing) {
    issues.error(
      'chybejici_sloupec',
      { sheet: sheetName },
      `Listu \`${sheetName}\` chybí povinný sloupec \`${column}\`.`,
      { value: column },
    )
  }
  return missing.length === 0
}

function parseCharacters(
  workbook: Workbook,
  issues: IssueCollector,
  repairs: Repairs,
): ParsedCharacter[] {
  const read = sheet(workbook, CHARACTERS_SHEET, repairs)
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
  const scaleColumns = read.headers.filter((h) => h.startsWith('S_'))
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
      const key = column.slice(2)
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

function collectGroups(characters: ParsedCharacter[]): ParsedConfig['groups'] {
  const groups: ParsedConfig['groups'] = []
  const seen = new Set<string>()
  for (const character of characters) {
    if (character.groupName === '' || seen.has(character.groupName)) continue
    seen.add(character.groupName)
    groups.push({ name: character.groupName, location: character.location })
  }
  return groups
}

function parseScales(
  workbook: Workbook,
  chapter: number,
  issues: IssueCollector,
  repairs: Repairs,
): ParsedScale[] {
  const name = `${chapter}_Scales`
  const read = sheet(workbook, name, repairs)
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
    let scope: 'postava' | 'domacnost' = 'postava'
    if (scopeRaw === 'domacnost' || scopeRaw === 'domácnost') {
      scope = 'domacnost'
    } else if (scopeRaw !== 'postava') {
      issues.error(
        'chybejici_hodnota',
        row.at('Rozsah'),
        `Škála \`${key}\` má neznámý rozsah platnosti „${scopeRaw}" — čeká se \`postava\` nebo \`domacnost\`.`,
        { value: scopeRaw },
      )
    }

    const min = numberOr(row.get('Min'), 1)
    const max = numberOr(row.get('Max'), 10)

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
      min,
      max,
      bands: parseBands(row.get('Prahy'), row.get('Nazvy pasem'), key, row.at('Prahy'), issues),
      mergeStrategy,
      splitStrategy,
      location: row.at('Scale ID'),
    })
  }

  return scales
}

/** `1-3;4-5;6-8;9-10` paired with `Na dně;Vyžije;…` (§4.1). */
function parseBands(
  thresholds: string,
  names: string,
  scaleKey: string,
  location: IssueLocation,
  issues: IssueCollector,
): ParsedBand[] {
  if (thresholds === '') return []
  const ranges = thresholds.split(';').map((s) => s.trim()).filter((s) => s !== '')
  const labels = names.split(';').map((s) => s.trim())

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
    const match = /^(\d+)\s*-\s*(\d+)$/.exec(range)
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
    bands.push({ ordinal: index + 1, min, max, name: labels[index] ?? `Pásmo ${index + 1}` })
  })

  return bands
}

/**
 * `kazdy_si_odnasi` is how the sheet spells the default split — each partner
 * takes the current household value, which is `kopie` in the data model (§4.4).
 */
function normalizeSplitStrategy(raw: string): string | undefined {
  if (raw === '') return undefined
  return raw === 'kazdy_si_odnasi' ? 'kopie' : raw
}

function numberOr(raw: string, fallback: number): number {
  const value = Number(raw)
  return Number.isInteger(value) ? value : fallback
}

function parseQuestions(
  workbook: Workbook,
  chapter: number,
  aliases: CharacterAliases,
  issues: IssueCollector,
  repairs: Repairs,
): ParsedQuestion[] {
  const name = `${chapter}_Questions`
  const read = sheet(workbook, name, repairs, ['Question ID', 'Character', 'Text', 'Typ', 'Zdroj', 'Parova'])
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
      if (!QUESTION_TYPES.has(typeRaw)) {
        issues.error(
          'chybejici_hodnota',
          row.at('Typ'),
          `Otázka \`${questionId}\` má neznámý typ „${typeRaw}" — čeká se ${[...QUESTION_TYPES].map((t) => `\`${t}\``).join(', ')}.`,
          { value: typeRaw },
        )
      }
      const sourceRaw = row.get('Zdroj')
      const source = sourceRaw === 'org' ? 'org' : 'hrac'
      if (sourceRaw !== '' && sourceRaw !== 'org' && !isPlayerWord(sourceRaw)) {
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
        type: (QUESTION_TYPES.has(typeRaw) ? typeRaw : 'text') as ParsedQuestion['type'],
        source,
        isPaired: isYes(row.get('Parova')),
        options: [],
        location: row.at('Question ID'),
      }
      byId.set(questionId, question)
      questions.push(question)

      if (question.characterRef === '') {
        issues.error(
          'chybejici_hodnota',
          row.at('Character'),
          `Otázka \`${questionId}\` nemá postavu.`,
        )
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
    if (answerId === '') {
      // A question row with no answer is only a problem if no other row brings
      // one; that is checked once the whole sheet is read.
      continue
    }
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

    const impactCell = row.get('Scale Impact')
    const { impacts, problems } = parseScaleImpact(impactCell)
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
      effects: parseEffects(row.get('Effects'), answerId, row.at('Effects'), issues),
      isOther: answerId.endsWith('_OTHER_') || row.get('Answer Text') === '_OTHER_',
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

  return questions
}

/** `hráč`, `hrac`, `Hráč` — the sheet is written by hand. */
function isPlayerWord(value: string): boolean {
  const folded = value.toLowerCase()
  return folded === 'hráč' || folded === 'hrac' || folded === 'hráčka' || folded === 'hracka'
}

function isYes(value: string): boolean {
  const folded = value.toLowerCase()
  return folded === 'ano' || folded === 'true' || folded === 'x' || folded === '1'
}

function splitList(cell: string): string[] {
  return cell
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

function parseEffects(
  cell: string,
  answerId: string,
  location: IssueLocation,
  issues: IssueCollector,
): ParsedAnswerEffect[] {
  const effects: ParsedAnswerEffect[] = []
  for (const raw of splitList(cell)) {
    const match = /^([A-Z_]+)\(([^)]*)\)$/.exec(raw)
    if (!match) {
      issues.error(
        'chybejici_hodnota',
        location,
        `Efekt „${raw}" u odpovědi \`${answerId}\` se nedá přečíst — čeká se tvar \`NAZEV(argument)\`, například \`SNATEK(Mirek)\`.`,
        { value: raw },
      )
      continue
    }
    const name = match[1] ?? ''
    const argument = match[2] ?? ''
    if (!ANSWER_EFFECTS.has(name)) {
      issues.error(
        'chybejici_hodnota',
        location,
        `Neznámý efekt \`${name}\` u odpovědi \`${answerId}\` — k dispozici jsou ${[...ANSWER_EFFECTS].join(', ')}.`,
        { value: name },
      )
      continue
    }
    effects.push({ name, argument: argument.trim(), raw })
  }
  return effects
}

/**
 * Resolves the owning `Character` cell, tolerating the name where the registry
 * has an ID (`Věra` for `Vera`). A resolved name is a warning, not an error:
 * the sheet is worth fixing, but one habit of the author must not block the
 * whole config. An unknown value is left to the validation to report.
 */
function resolveOwner(
  value: string,
  aliases: CharacterAliases,
  repairs: Repairs,
  location: IssueLocation,
  subject: string,
  issues: IssueCollector,
): string | undefined {
  const resolved = resolveCharacter(value, aliases)
  if (resolved.status === 'neznama') return undefined
  if (resolved.status === 'podle_jmena') {
    repairs.resolvedCharacterNames++
    issues.warn(
      'neznama_postava',
      location,
      `${subject} je vedená na „${value}", což není ID z listu \`Characters\` — import to přiřadil postavě \`${resolved.id}\` podle jména. V tabulce patří ID.`,
      { value, suggestion: resolved.id },
    )
  }
  return resolved.id
}

/**
 * Which character an option names (§6.6). An option that names another
 * character must reference the registry ID, never free text — otherwise a
 * marriage or a rename breaks the link. The ID suffix is the author's own
 * convention (`A_Marie_2_1_Mirek`), and a structural effect states it outright.
 */
function resolveReferencedCharacter(
  option: ParsedAnswerOption,
  characterIds: Set<string>,
): string | undefined {
  const fromEffect = option.effects.find((e) => characterIds.has(e.argument))
  if (fromEffect) return fromEffect.argument
  const suffix = option.externalId.split('_').pop()
  if (suffix && characterIds.has(suffix)) return suffix
  return undefined
}

function parseContent(
  workbook: Workbook,
  chapter: number,
  aliases: CharacterAliases,
  issues: IssueCollector,
  repairs: Repairs,
): ParsedBlock[] {
  const name = `${chapter}_Content`
  const read = sheet(workbook, name, repairs, ['Character', 'Block ID'])
  // Content is optional: a chapter whose documents are not generated has none.
  if (!read) return []
  if (!requireColumns(name, read.headers, CONTENT_COLUMNS, issues)) return []

  const blocks: ParsedBlock[] = []
  const byId = new Map<string, ParsedBlock>()
  const seenVariations = new Map<string, number>()

  for (const row of read.rows) {
    const blockId = row.get('Block ID')
    if (blockId === '') {
      issues.error(
        'chybejici_hodnota',
        row.at('Block ID'),
        'Řádek nepatří k žádnému bloku — `Block ID` je prázdné i po doplnění sloučených buněk.',
      )
      continue
    }

    let block = byId.get(blockId)
    if (!block) {
      const characterRef = row.get('Character')
      block = {
        externalId: blockId,
        chapter,
        characterRef,
        characterId: resolveOwner(characterRef, aliases, repairs, row.at('Character'), `Blok \`${blockId}\``, issues),
        variations: [],
        location: row.at('Block ID'),
      }
      byId.set(blockId, block)
      blocks.push(block)
    }

    const variationId = row.get('Variation ID')
    if (variationId === '') {
      issues.error(
        'chybejici_hodnota',
        row.at('Variation ID'),
        `Varianta bloku \`${blockId}\` nemá \`Variation ID\`.`,
      )
      continue
    }
    const previous = seenVariations.get(variationId)
    if (previous !== undefined) {
      issues.error(
        'duplicitni_id',
        row.at('Variation ID'),
        `Varianta \`${variationId}\` je v listu \`${name}\` dvakrát (poprvé na řádku ${previous}).`,
        { value: variationId },
      )
      continue
    }
    seenVariations.set(variationId, row.rowNumber)

    const priorityRaw = row.get('Priority')
    const priority = Number(priorityRaw)
    if (!Number.isInteger(priority) || priority < 1) {
      issues.error(
        'chybejici_hodnota',
        row.at('Priority'),
        `Varianta \`${variationId}\` má neplatnou prioritu „${priorityRaw}" — čeká se celé číslo od 1.`,
        { value: priorityRaw },
      )
      continue
    }

    const condition = parseCondition(row.get('Conditions'))
    if (!condition.ok) {
      issues.error(
        'vadny_vyraz',
        row.at('Conditions'),
        `Podmínka varianty \`${variationId}\` je syntakticky vadná: ${condition.error}.`,
        { value: condition.raw },
      )
    }

    const variation: ParsedVariation = {
      externalId: variationId,
      priority,
      description: row.get('Variation Description'),
      // Empty text is legitimate — the "nothing happened" variant (§8.2).
      text: row.get('Variation Text'),
      condition,
      location: row.at('Variation ID'),
    }
    block.variations.push(variation)
  }

  return blocks
}

function parseTemplateSheet(
  workbook: Workbook,
  issues: IssueCollector,
  repairs: Repairs,
): ParsedConfig['templateAssignments'] {
  const read = sheet(workbook, 'Templates', repairs)
  if (!read) return []
  if (!requireColumns('Templates', read.headers, ['Template ID', 'Character'], issues)) return []

  return read.rows
    .filter((row) => row.get('Template ID') !== '')
    .map((row) => ({
      externalId: row.get('Template ID'),
      characterRef: row.get('Character'),
      location: row.at('Template ID'),
    }))
}

export { columnLetter }
