import type { Catalog } from '../catalog/buildCatalog'
import type { CompiledConditions } from '../evaluationContext'
import { compileCondition } from '../expression/compileCondition'
import type { ChapterNumber } from '../types/ids'
import type { Rule } from '../types/rule'

export const applicableRules = (rules: Rule[], chapter: ChapterNumber): Rule[] =>
  rules.filter((rule) => rule.chapter === undefined || rule.chapter === chapter)

/** Everything the chapter can evaluate is compiled up front, so a typo fails even on a path never taken. */
export const compileConditions = (catalog: Catalog, chapter: ChapterNumber): CompiledConditions => {
  const variations: CompiledConditions['variations'] = new Map()
  const rules: CompiledConditions['rules'] = new Map()

  for (const block of catalog.config.blocks) {
    if (block.chapter !== chapter) continue
    for (const variation of block.variations) {
      variations.set(variation.id, compileCondition(variation.condition, { catalog, chapter, ownerId: variation.id }))
    }
  }

  for (const rule of applicableRules(catalog.config.rules, chapter)) {
    rules.set(rule.id, compileCondition(rule.condition, { catalog, chapter, ownerId: rule.id }))
  }

  return { variations, rules }
}
