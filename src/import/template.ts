/**
 * Template markers (§8.4).
 *
 * Markers are simple and unpaired: `{BLOK <Block ID>}` is replaced by the text
 * of the variant the engine picked, `{PROMENNA}` by a value from the character
 * state. The text itself lives in the `N_Content` sheet, not in the template
 * (§8.2), so there is nothing for a closing marker to delimit.
 *
 * No marker may survive into the finished document, so a malformed one has to
 * be caught at upload — not when the org is about to print.
 */
import type { ParsedTemplate, UploadedTemplate } from './types/parsed-template'

/** Variables the filler knows (§8.4). */
export const KNOWN_VARIABLES = Object.freeze(['JMENO', 'PRIJMENI', 'VEK', 'SKUPINA'] as const)

export interface TemplateMarker {
  kind: 'blok' | 'promenna'
  /** Block ID for `blok`, variable name for `promenna`. */
  name: string
  /** 1-based line in the Markdown file, so the org can find it. */
  line: number
  /** The marker exactly as written. */
  raw: string
}

export interface TemplateMarkerProblem {
  line: number
  raw: string
  /** Czech explanation for the import report. */
  detail: string
}

export interface TemplateParse {
  markers: TemplateMarker[]
  problems: TemplateMarkerProblem[]
  /** Block IDs referenced, deduplicated. */
  blockIds: string[]
  /** Variable names referenced, deduplicated. */
  variables: string[]
}

/** Keyword opening a block marker, `{BLOK <ID>}`. */
const BLOCK_KEYWORD = 'BLOK'

/** Any `{…}` group; what is inside decides whether it is valid. */
const BRACE_GROUP = /\{([^{}]*)\}/g
/** An opening brace with no closing one on the same line. */
const UNCLOSED = /\{[^{}]*$/

export const parseTemplate = (markdown: string): TemplateParse => {
  const markers: TemplateMarker[] = []
  const problems: TemplateMarkerProblem[] = []
  const blockIds = new Set<string>()
  const variables = new Set<string>()

  markdown.split(/\r?\n/).forEach((text, index) => {
    const line = index + 1

    for (const match of text.matchAll(BRACE_GROUP)) {
      const raw = match[0]
      const inner = (match[1] ?? '').trim()

      if (inner === '') {
        problems.push({ line, raw, detail: 'prázdná značka `{}`' })
        continue
      }

      if (/^\/\s*BLOK/i.test(inner)) {
        // The old paired form. Markers are unpaired since §8.2 moved the text
        // into the sheet, so a closing marker would survive into the document.
        problems.push({
          line,
          raw,
          detail:
            'uzavírací značka `{/BLOK}` se nepoužívá — značky jsou nepárové, text nese list `N_Content` (§8.4)',
        })
        continue
      }

      if (/^BLOK\b/i.test(inner)) {
        const id = inner.slice(BLOCK_KEYWORD.length).trim()
        if (id === '') {
          problems.push({ line, raw, detail: 'značka `{BLOK}` bez ID bloku' })
          continue
        }
        if (/\s/.test(id)) {
          problems.push({
            line,
            raw,
            detail: `ID bloku nesmí obsahovat mezeru, je tam „${id}"`,
          })
          continue
        }
        markers.push({ kind: 'blok', name: id, line, raw })
        blockIds.add(id)
        continue
      }

      // Anything else in braces is a variable.
      if (/\s/.test(inner)) {
        problems.push({
          line,
          raw,
          detail: `neznámá značka — čeká se \`{BLOK <ID>}\` nebo proměnná bez mezer`,
        })
        continue
      }
      markers.push({ kind: 'promenna', name: inner, line, raw })
      variables.add(inner)
    }

    const stripped = text.replace(BRACE_GROUP, '')
    if (UNCLOSED.test(stripped)) {
      problems.push({
        line,
        raw: UNCLOSED.exec(stripped)?.[0] ?? '{',
        detail: 'neuzavřená značka — chybí `}`',
      })
    }
    if (stripped.includes('}')) {
      problems.push({ line, raw: '}', detail: 'zavírací `}` bez odpovídající `{`' })
    }
  })

  return {
    markers,
    problems,
    blockIds: [...blockIds],
    variables: [...variables],
  }
}

/** Template ID a `.md` filename maps to, matched against `Characters.Template ID`. */
export const templateIdFromFilename = (filename: string): string => {
  const base = filename.replace(/\.md$/i, '').split('/').pop() ?? filename

  return base.trim()
}

/** A template with its markers read, ready for validation. */
export const toParsedTemplate = ({ filename, markdown }: UploadedTemplate): ParsedTemplate => {
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
