/**
 * Uploading document templates (§10.3).
 *
 * Templates arrive as Markdown exported from Google Docs, either as several
 * `.md` files at once or as one zip. They are uploaded once per chapter, not
 * with every import, so the screen has to show which character still has none.
 */
import JSZip from 'jszip'
import { parseTemplate, templateIdFromFilename } from './template'
import type { ParsedConfig, ParsedTemplate } from './types'

export interface RawFile {
  filename: string
  /** Raw bytes; text files are decoded as UTF-8 to keep diacritics intact. */
  data: ArrayBuffer | Uint8Array
}

/** Reads `.md` files, unpacking any zip among them. */
export async function readTemplateFiles(files: RawFile[]): Promise<ParsedTemplate[]> {
  const collected: { filename: string; markdown: string }[] = []

  for (const file of files) {
    if (/\.zip$/i.test(file.filename)) {
      collected.push(...(await readZip(file.data)))
      continue
    }
    if (!/\.md$/i.test(file.filename)) continue
    collected.push({ filename: file.filename, markdown: decodeUtf8(file.data) })
  }

  return collected.map(toParsedTemplate)
}

async function readZip(data: ArrayBuffer | Uint8Array): Promise<{ filename: string; markdown: string }[]> {
  const zip = await JSZip.loadAsync(data)
  const out: { filename: string; markdown: string }[] = []

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue
    // Zips from macOS carry a `__MACOSX` shadow tree; it is not content.
    if (entry.name.startsWith('__MACOSX/') || entry.name.includes('/._')) continue
    if (!/\.md$/i.test(entry.name)) continue
    out.push({ filename: entry.name, markdown: await entry.async('string') })
  }

  return out
}

function decodeUtf8(data: ArrayBuffer | Uint8Array): string {
  return new TextDecoder('utf-8').decode(data instanceof Uint8Array ? data : new Uint8Array(data))
}

function toParsedTemplate({
  filename,
  markdown,
}: {
  filename: string
  markdown: string
}): ParsedTemplate {
  const parsed = parseTemplate(markdown)
  return {
    externalId: templateIdFromFilename(filename),
    filename,
    markdown,
    blockIds: parsed.blockIds,
    variables: parsed.variables,
    problems: parsed.problems,
  }
}

export interface TemplateAssignment {
  characterExternalId: string
  characterName: string
  /** Template ID from the `Characters` sheet. */
  expected: string
  /** The uploaded file that matched, if any. */
  filename?: string
  status: 'prirazena' | 'chybi' | 'nezadana'
}

export interface TemplateCoverage {
  assignments: TemplateAssignment[]
  /** Uploaded files that belong to no character. */
  unmatched: ParsedTemplate[]
  missingCount: number
}

/**
 * Matches uploaded files to characters by the `Template ID` from the
 * `Characters` sheet (§10.3), so the org can see at a glance who has no
 * document yet.
 *
 * A file matches either by its template ID (`T_Marie.md`) or by the character's
 * own ID (`marie.md`) — the author names the export after whichever is at hand.
 */
export function templateCoverage(
  config: ParsedConfig,
  templates: ParsedTemplate[],
): TemplateCoverage {
  const byId = new Map<string, ParsedTemplate>()
  for (const template of templates) {
    byId.set(template.externalId.toLowerCase(), template)
  }

  const used = new Set<string>()
  const assignments = config.characters.map((character): TemplateAssignment => {
    const name = `${character.firstName} ${character.lastName}`.trim() || character.externalId

    if (character.templateExternalId === '') {
      return {
        characterExternalId: character.externalId,
        characterName: name,
        expected: '',
        status: 'nezadana',
      }
    }

    const match =
      byId.get(character.templateExternalId.toLowerCase()) ??
      byId.get(character.externalId.toLowerCase())

    if (match) used.add(match.filename)

    return {
      characterExternalId: character.externalId,
      characterName: name,
      expected: character.templateExternalId,
      filename: match?.filename,
      status: match ? 'prirazena' : 'chybi',
    }
  })

  return {
    assignments,
    unmatched: templates.filter((t) => !used.has(t.filename)),
    missingCount: assignments.filter((a) => a.status !== 'prirazena').length,
  }
}
