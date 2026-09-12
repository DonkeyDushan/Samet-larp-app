/**
 * Import findings (§11).
 *
 * An error blocks the config from being used; a warning lets it through. The
 * import never stops at the first problem — the author wants to fix twenty
 * typos in one round, not upload the file twenty times.
 *
 * Every message must say where the problem is, because the author fixes it in
 * the spreadsheet and has to find the row: sheet, row, column, value. "Invalid
 * scale reference" is useless; "sheet `2_Questions`, row 34, column
 * `Scale Impact`: scale `S_Marie_Welth_osobni` does not exist, did you mean
 * `S_Marie_Wealth_osobni`?" is usable.
 */

export type IssueSeverity = 'chyba' | 'varovani'

/** Stable code so the UI can group findings and tests can assert on them. */
export type IssueCode =
  | 'chybejici_list'
  | 'chybejici_sloupec'
  | 'prazdny_list'
  | 'neznama_postava'
  | 'neznama_skala'
  | 'neznama_skupina'
  | 'neznamy_blok'
  | 'neznama_odpoved'
  | 'neznamy_priznak'
  | 'odpoved_bez_otazky'
  | 'otazka_bez_odpovedi'
  | 'duplicitni_id'
  | 'vadny_dopad_na_skalu'
  | 'hodnota_mimo_rozsah'
  | 'vadny_vyraz'
  | 'vadna_znacka_sablony'
  | 'blok_bez_znacky'
  | 'znacka_bez_bloku'
  | 'blok_bez_default'
  | 'stejna_priorita'
  | 'domacnostni_skala_bez_strategie'
  | 'postava_bez_sablony'
  | 'chybejici_hodnota'
  | 'nedosazitelna_varianta'
  | 'skala_bez_dopadu'
  | 'osamely_ucet'
  | 'nepouzity_priznak'

/** Where in the uploaded file the problem sits. */
export interface IssueLocation {
  /** Sheet name as it appears in the workbook, e.g. `2_Questions`. */
  sheet: string
  /** 1-based row as the author sees it in the spreadsheet (header is row 1). */
  row?: number
  /** Column header, e.g. `Scale Impact`. */
  column?: string
  /** Spreadsheet cell, e.g. `I5` — filled in when the column is known. */
  cell?: string
}

export interface Issue {
  severity: IssueSeverity
  code: IssueCode
  location: IssueLocation
  /** Czech, addressed to the game author. */
  message: string
  /** The offending value, quoted back so the author can search for it. */
  value?: string
  /** "Did you mean …?" — only when a near match was found. */
  suggestion?: string
}

/** Collects findings without ever throwing; the import returns them all at once. */
export class IssueCollector {
  private readonly items: Issue[] = []

  add(issue: Issue): void {
    this.items.push(issue)
  }

  error(code: IssueCode, location: IssueLocation, message: string, extra?: Partial<Issue>): void {
    this.add({ severity: 'chyba', code, location, message, ...extra })
  }

  warn(code: IssueCode, location: IssueLocation, message: string, extra?: Partial<Issue>): void {
    this.add({ severity: 'varovani', code, location, message, ...extra })
  }

  get all(): readonly Issue[] {
    return this.items
  }

  get errors(): readonly Issue[] {
    return this.items.filter((i) => i.severity === 'chyba')
  }

  get warnings(): readonly Issue[] {
    return this.items.filter((i) => i.severity === 'varovani')
  }

  get hasErrors(): boolean {
    return this.items.some((i) => i.severity === 'chyba')
  }
}

/** Column index (0-based) to spreadsheet letter: 0 → `A`, 26 → `AA`. */
export function columnLetter(index: number): string {
  let n = index
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/**
 * Levenshtein distance, capped for short identifiers. Used only to offer
 * "did you mean" — a wrong guess costs nothing, a missing one costs the author
 * a hunt through the sheet.
 */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  let prev = Array.from({ length: cols }, (_, j) => j)
  for (let i = 1; i < rows; i++) {
    const curr = new Array<number>(cols).fill(0)
    curr[0] = i
    for (let j = 1; j < cols; j++) {
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = curr
  }
  return prev[cols - 1] ?? 0
}

/**
 * Closest known identifier, or undefined when nothing is near enough.
 * The threshold grows with length so `S_Marie_Welth_osobni` still matches
 * `S_Marie_Wealth_osobni`, while two unrelated short IDs do not match.
 */
export function suggestClosest(value: string, known: Iterable<string>): string | undefined {
  const limit = Math.max(2, Math.floor(value.length / 5))
  let best: string | undefined
  let bestDistance = Infinity
  for (const candidate of known) {
    const distance = editDistance(value.toLowerCase(), candidate.toLowerCase())
    if (distance < bestDistance && distance <= limit) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}
