import { DEFAULT_CONDITION } from '@/engine'
import type { IssueCollector } from '../issue-collector'
import type { ParsedBlock, ParsedVariation } from '../types/parsed-block'
import type { ParsedConfig } from '../types/parsed-config'
import { suggestClosest } from '../utils/suggest-closest'
import { knownScaleIds } from './known-scale-ids'

/** What a chapter's conditions may reference. */
interface ReferenceScope {
  chapter: number
  answerIds: Set<string>
  flagNames: Set<string>
  scaleIds: Set<string>
}

export const checkContent = (
  config: ParsedConfig,
  characterIds: Set<string>,
  issues: IssueCollector,
): void => {
  const knownCharacters = [...characterIds]

  for (const [chapter, blocks] of config.blocks) {
    const scope = referenceScope(config, chapter, characterIds)

    for (const block of blocks) {
      if (block.characterId === undefined) {
        issues.error(
          'neznama_postava',
          block.location,
          `Blok \`${block.externalId}\` je vedený na postavu \`${block.characterRef}\`, která není v listu \`Characters\`.`,
          {
            value: block.characterRef,
            suggestion: suggestClosest(block.characterRef, knownCharacters),
          },
        )
      }

      for (const variation of block.variations) {
        checkReferences(variation, scope, issues)
      }
      checkPriorities(block, issues)
    }
  }
}

/**
 * A character's state carries forward, so a chapter-2 condition may read a
 * chapter-1 answer or a flag an earlier chapter set — the spec's own example
 * mixes chapters in one expression (§4.5). Only later chapters are out of reach.
 */
const referenceScope = (config: ParsedConfig, chapter: number, characterIds: Set<string>): ReferenceScope => {
  const answerIds = new Set<string>()
  // Flags are not declared anywhere: they exist by being set (layer 2).
  const flagNames = new Set<string>()

  for (const [questionChapter, questions] of config.questions) {
    if (questionChapter > chapter) continue
    for (const question of questions) {
      for (const option of question.options) {
        answerIds.add(option.externalId)
        for (const flag of option.flags) flagNames.add(flag)
      }
    }
  }

  const scaleKeys = (config.scales.get(chapter) ?? []).map((s) => s.key)

  return { chapter, answerIds, flagNames, scaleIds: new Set(knownScaleIds(characterIds, scaleKeys)) }
}

const checkReferences = (variation: ParsedVariation, scope: ReferenceScope, issues: IssueCollector): void => {
  for (const reference of variation.condition.references) {
    switch (reference.kind) {
      case 'odpoved':
        if (!scope.answerIds.has(reference.name)) {
          issues.error(
            'neznama_odpoved',
            variation.location,
            `Podmínka varianty \`${variation.externalId}\` odkazuje na odpověď \`${reference.name}\`, která neexistuje v kapitole ${scope.chapter} ani v žádné dřívější.`,
            { value: reference.name, suggestion: suggestClosest(reference.name, scope.answerIds) },
          )
        }
        break
      case 'skala':
        if (!scope.scaleIds.has(reference.name)) {
          issues.error(
            'neznama_skala',
            variation.location,
            `Podmínka varianty \`${variation.externalId}\` odkazuje na škálu \`${reference.name}\`, která neexistuje.`,
            { value: reference.name, suggestion: suggestClosest(reference.name, scope.scaleIds) },
          )
        }
        break
      case 'priznak':
        if (!scope.flagNames.has(reference.name)) {
          issues.warn(
            'neznamy_priznak',
            variation.location,
            `Podmínka varianty \`${variation.externalId}\` čeká příznak \`${reference.name}\`, který nenastavuje žádná odpověď v kapitole ${scope.chapter} ani dřív — podmínka nemůže nikdy platit.`,
            { value: reference.name, suggestion: suggestClosest(reference.name, scope.flagNames) },
          )
        }
        break
      default:
        issues.error(
          'vadny_vyraz',
          variation.location,
          `Podmínka varianty \`${variation.externalId}\` odkazuje na \`${reference.name}\`, což není ani odpověď (\`A_\`), ani škála (\`S_\`), ani příznak (\`F_\`).`,
          { value: reference.name },
        )
    }
  }
}

/**
 * §8.2: variants are walked by ascending priority and the first match wins, so
 * equal priorities would depend on row order and a block without `DEFAULT`
 * could return nothing.
 */
const checkPriorities = (block: ParsedBlock, issues: IssueCollector): void => {
  const byPriority = new Map<number, string[]>()
  for (const variation of block.variations) {
    const sharing = byPriority.get(variation.priority) ?? []
    sharing.push(variation.externalId)
    byPriority.set(variation.priority, sharing)
  }

  for (const [priority, sharing] of byPriority) {
    if (sharing.length > 1) {
      issues.error(
        'stejna_priorita',
        block.location,
        `Varianty ${sharing.map((v) => `\`${v}\``).join(', ')} bloku \`${block.externalId}\` mají stejnou prioritu ${priority} — výsledek by závisel na pořadí řádků.`,
        { value: String(priority) },
      )
    }
  }

  const defaultPriority = block.variations.find((v) => v.condition.isDefault)?.priority
  if (defaultPriority === undefined) {
    issues.error(
      'blok_bez_default',
      block.location,
      `Blok \`${block.externalId}\` nemá variantu s podmínkou \`${DEFAULT_CONDITION}\` — když neprojde žádná podmínka, značka v dokumentu nevrátí nic.`,
      { value: block.externalId },
    )

    return
  }

  // DEFAULT is always true, so anything after it can never be reached.
  for (const variation of block.variations) {
    if (variation.priority > defaultPriority) {
      issues.warn(
        'nedosazitelna_varianta',
        variation.location,
        `Varianta \`${variation.externalId}\` má prioritu ${variation.priority}, ale \`DEFAULT\` stojí už na prioritě ${defaultPriority} — nikdy se nepoužije.`,
        { value: variation.externalId },
      )
    }
  }
}
