/** Sheet names and required columns of the config workbook (§4.2). */

/** Character registry; the only chapter-independent data sheet. */
export const CHARACTERS_SHEET = 'Characters'

/** Optional sheet assigning template IDs to characters. */
export const TEMPLATES_SHEET = 'Templates'

/** Validation notes for the author; read by nobody but them. */
export const VALIDATIONS_SHEET = 'Validations'

/** Sheets that are documentation, not data. */
export const IGNORED_SHEETS = Object.freeze(['Legend', 'Legenda'])

/** Per-chapter sheets are named `<chapter>_<kind>`, e.g. `2_Questions`. */
export const CHAPTER_SHEET_KINDS = Object.freeze(['Questions', 'Scales', 'Content'] as const)

export type ChapterSheetKind = (typeof CHAPTER_SHEET_KINDS)[number]

/** The game has exactly three chapters (§3.1). */
export const CHAPTERS = Object.freeze([1, 2, 3] as const)

export const CHARACTER_COLUMNS = Object.freeze(['Character ID', 'Jmeno', 'Prijmeni', 'Skupina', 'Template ID'])

export const SCALE_COLUMNS = Object.freeze(['Scale ID', 'Nazev', 'Rozsah', 'Prahy', 'Nazvy pasem'])

export const QUESTION_COLUMNS = Object.freeze(['Question ID', 'Character', 'Text', 'Typ', 'Answer ID', 'Answer Text'])

/** Question-level columns merged over all answer rows of one question. */
export const QUESTION_FILL_DOWN_COLUMNS = Object.freeze(['Question ID', 'Character', 'Text', 'Typ', 'Zdroj', 'Parova'])

export const CONTENT_COLUMNS = Object.freeze(['Character', 'Block ID', 'Variation ID', 'Variation Text', 'Priority', 'Conditions'])

/** `Character` and `Block ID` are filled only on the first row of a group (§8.2). */
export const CONTENT_FILL_DOWN_COLUMNS = Object.freeze(['Character', 'Block ID'])

export const TEMPLATE_COLUMNS = Object.freeze(['Template ID', 'Character'])

/** Prefix of `Characters` columns holding chapter-1 starting values (`S_Regime`). */
export const INITIAL_SCALE_COLUMN_PREFIX = 'S_'

export const chapterSheetName = (chapter: number, kind: ChapterSheetKind): string => `${chapter}_${kind}`
