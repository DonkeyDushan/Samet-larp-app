import { chapterSheetName } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import { KNOWN_VARIABLES } from '../template'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedTemplate } from '../types/parsed-template'
import { suggestClosest } from '../utils/suggest-closest'

/** `{S_Wealth_osobni}` prints a scale value; the prefix is the author's. */
const SCALE_VARIABLE_PREFIX = 'S_'

/**
 * §8.4: a `{BLOK}` marker with no record in `N_Content` and a block in
 * `N_Content` with no marker pointing at it are both errors — in the first case
 * the marker would survive into the printed document.
 */
export const checkTemplates = (
  config: ParsedConfig,
  templates: ParsedTemplate[],
  issues: IssueCollector,
): void => {
  const allBlocks = new Map<string, number>()
  for (const [chapter, blocks] of config.blocks) {
    for (const block of blocks) allBlocks.set(block.externalId, chapter)
  }

  const scaleKeys = new Set<string>()
  for (const scales of config.scales.values()) {
    for (const scale of scales) scaleKeys.add(scale.key)
  }

  const knownVariables: string[] = [...KNOWN_VARIABLES]
  for (const key of scaleKeys) knownVariables.push(`${SCALE_VARIABLE_PREFIX}${key}`)

  const markedBlocks = new Set<string>()

  for (const template of templates) {
    const location = { sheet: template.filename }

    for (const problem of template.problems) {
      issues.error(
        'vadna_znacka_sablony',
        { ...location, row: problem.line },
        `Šablona \`${template.filename}\`, řádek ${problem.line}: ${problem.detail}.`,
        { value: problem.raw },
      )
    }

    for (const blockId of template.blockIds) {
      markedBlocks.add(blockId)
      if (!allBlocks.has(blockId)) {
        issues.error(
          'znacka_bez_bloku',
          location,
          `Šablona \`${template.filename}\` obsahuje značku \`{BLOK ${blockId}}\`, ale blok \`${blockId}\` není v žádném listu \`N_Content\` — značka by zůstala v hotovém dokumentu.`,
          { value: blockId, suggestion: suggestClosest(blockId, allBlocks.keys()) },
        )
      }
    }

    for (const variable of template.variables) {
      const isKnown = (KNOWN_VARIABLES as readonly string[]).includes(variable)
      const isScale = variable.startsWith(SCALE_VARIABLE_PREFIX) && scaleKeys.has(variable.slice(SCALE_VARIABLE_PREFIX.length))
      if (!isKnown && !isScale) {
        issues.error(
          'vadna_znacka_sablony',
          location,
          `Šablona \`${template.filename}\` používá proměnnou \`{${variable}}\`, kterou aplikace neumí naplnit — zůstala by v hotovém dokumentu.`,
          { value: variable, suggestion: suggestClosest(variable, knownVariables) },
        )
      }
    }
  }

  for (const [blockId, chapter] of allBlocks) {
    if (!markedBlocks.has(blockId)) {
      const sheet = chapterSheetName(chapter, 'Content')
      issues.error(
        'blok_bez_znacky',
        { sheet },
        `Blok \`${blockId}\` je v listu \`${sheet}\`, ale žádná nahraná šablona na něj nemá značku \`{BLOK ${blockId}}\` — jeho text se nikam nedostane.`,
        { value: blockId },
      )
    }
  }

  const uploaded = new Set(templates.map((t) => t.externalId))
  for (const character of config.characters) {
    if (character.templateExternalId !== '' && !uploaded.has(character.templateExternalId)) {
      issues.error(
        'postava_bez_sablony',
        character.location,
        `Postava \`${character.externalId}\` má přiřazenou šablonu \`${character.templateExternalId}\`, ale ta nebyla nahraná.`,
        { value: character.templateExternalId },
      )
    }
  }
}
