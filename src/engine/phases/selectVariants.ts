/**
 * After the six phases: one variation per block, against the finished state
 * (§8.2). Ascending priority, first condition that holds wins — priority
 * decides completely, so variations never conflict.
 */
import { fail } from '../errors/engineInputError'
import type { EvaluationContext } from '../evaluationContext'
import { evaluateInContext } from '../expression/evaluateInContext'
import type { BlockDefinition } from '../types/block'
import type { VariantSelection } from '../types/result'
import type { VariantEvaluation } from '../types/trace'
import { compareIds } from '../utils/compareIds'

const selectVariant = (context: EvaluationContext, block: BlockDefinition): VariantSelection => {
  const variations = [...block.variations].sort((a, b) => a.priority - b.priority || compareIds(a.id, b.id))
  const evaluations: VariantEvaluation[] = []

  for (const variation of variations) {
    const condition =
      context.conditions.variations.get(variation.id) ?? fail('neplatny_vyraz', variation.id, 'condition was not compiled')
    const outcome = evaluateInContext(context, condition, block.characterId, { ownerKind: 'varianta', ownerId: variation.id })
    evaluations.push({ variationId: variation.id, priority: variation.priority, result: outcome.result, readings: outcome.readings })
    if (outcome.result === 'neplati') continue

    // Unknown stops the walk: until it is settled, nobody knows whether this variation applies.
    const decided = outcome.result === 'plati'
    context.trace.push({
      phase: 'varianty',
      kind: 'varianta',
      characterId: block.characterId,
      blockId: block.id,
      variationId: decided ? variation.id : null,
      evaluations,
    })

    return {
      blockId: block.id,
      characterId: block.characterId,
      status: decided ? 'vybrana' : 'nerozhodnuto',
      variationId: decided ? variation.id : null,
      text: decided ? variation.text : null,
    }
  }

  return fail('blok_bez_vysledku', block.id, 'no variation holds and there is no DEFAULT')
}

export const selectVariants = (context: EvaluationContext): VariantSelection[] =>
  context.catalog.config.blocks
    .filter((block) => block.chapter === context.chapter)
    .sort((a, b) => compareIds(a.id, b.id))
    .map((block) => selectVariant(context, block))
