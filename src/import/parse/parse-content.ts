import type { CharacterAliases } from '../characters'
import { MIN_VARIATION_PRIORITY } from '../constants/scale-defaults'
import { chapterSheetName, CONTENT_COLUMNS, CONTENT_FILL_DOWN_COLUMNS } from '../constants/sheets'
import { parseCondition } from '../expression'
import type { IssueCollector } from '../issue-collector'
import type { ParsedBlock } from '../types/parsed-block'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import { readConfigSheet, requireColumns } from './read-config-sheet'
import { resolveOwner } from './resolve-character-refs'

export const parseContent = (
  workbook: Workbook,
  chapter: number,
  aliases: CharacterAliases,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedBlock[] => {
  const name = chapterSheetName(chapter, 'Content')
  const read = readConfigSheet(workbook, name, repairs, CONTENT_FILL_DOWN_COLUMNS)
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
    if (!Number.isInteger(priority) || priority < MIN_VARIATION_PRIORITY) {
      issues.error(
        'chybejici_hodnota',
        row.at('Priority'),
        `Varianta \`${variationId}\` má neplatnou prioritu „${priorityRaw}" — čeká se celé číslo od ${MIN_VARIATION_PRIORITY}.`,
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

    block.variations.push({
      externalId: variationId,
      priority,
      description: row.get('Variation Description'),
      // Empty text is legitimate — the "nothing happened" variant (§8.2).
      text: row.get('Variation Text'),
      condition,
      location: row.at('Variation ID'),
    })
  }

  return blocks
}
