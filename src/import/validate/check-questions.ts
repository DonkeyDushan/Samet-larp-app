import { CHARACTER_ARGUMENT_EFFECTS, GROUP_ARGUMENT_EFFECTS } from '../constants/sheet-vocabulary'
import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import { suggestClosest } from '../utils/suggest-closest'
import { knownScaleIds } from './known-scale-ids'

export const checkQuestions = (
  config: ParsedConfig,
  characterIds: Set<string>,
  groupNames: Set<string>,
  issues: IssueCollector,
): void => {
  const knownCharacters = [...characterIds]

  for (const [chapter, questions] of config.questions) {
    const scaleKeys = new Set((config.scales.get(chapter) ?? []).map((s) => s.key))
    const blockIds = new Set((config.blocks.get(chapter) ?? []).map((b) => b.externalId))
    const scaleIds = knownScaleIds(characterIds, scaleKeys)
    const knownBlockIds = [...blockIds]

    for (const question of questions) {
      if (question.characterId === undefined) {
        issues.error(
          'neznama_postava',
          question.location,
          `Otázka \`${question.externalId}\` je vedená na postavu \`${question.characterRef}\`, která není v listu \`Characters\`.`,
          {
            value: question.characterRef,
            suggestion: suggestClosest(question.characterRef, knownCharacters),
          },
        )
      }

      for (const option of question.options) {
        for (const impact of option.impacts) {
          if (!characterIds.has(impact.character)) {
            issues.error(
              'neznama_postava',
              option.location,
              `Dopad \`${impact.raw}\` u odpovědi \`${option.externalId}\` míří na postavu \`${impact.character}\`, která není v listu \`Characters\`.`,
              {
                value: impact.character,
                suggestion: suggestClosest(impact.character, knownCharacters),
              },
            )
          }
          if (!scaleKeys.has(impact.scale)) {
            issues.error(
              'neznama_skala',
              option.location,
              `Škála \`${impact.externalId}\` neexistuje — v listu \`${chapter}_Scales\` není škála \`${impact.scale}\`.`,
              {
                value: impact.externalId,
                suggestion: suggestClosest(impact.externalId, scaleIds),
              },
            )
          }
        }

        for (const blockId of option.blocks) {
          if (!blockIds.has(blockId)) {
            issues.error(
              'neznamy_blok',
              option.location,
              `Odpověď \`${option.externalId}\` zapíná blok \`${blockId}\`, který není v listu \`${chapter}_Content\`.`,
              { value: blockId, suggestion: suggestClosest(blockId, knownBlockIds) },
            )
          }
        }

        for (const effect of option.effects) {
          if (CHARACTER_ARGUMENT_EFFECTS.includes(effect.name) && !characterIds.has(effect.argument)) {
            issues.error(
              'neznama_postava',
              option.location,
              `Efekt \`${effect.raw}\` u odpovědi \`${option.externalId}\` odkazuje na postavu \`${effect.argument}\`, která není v listu \`Characters\`.`,
              {
                value: effect.argument,
                suggestion: suggestClosest(effect.argument, knownCharacters),
              },
            )
          }
          if (GROUP_ARGUMENT_EFFECTS.includes(effect.name) && !groupNames.has(effect.argument)) {
            issues.error(
              'neznama_skupina',
              option.location,
              `Efekt \`${effect.raw}\` u odpovědi \`${option.externalId}\` odkazuje na skupinu \`${effect.argument}\`, která u žádné postavy v listu \`Characters\` není.`,
              {
                value: effect.argument,
                suggestion: suggestClosest(effect.argument, groupNames),
              },
            )
          }
        }
      }
    }
  }
}
