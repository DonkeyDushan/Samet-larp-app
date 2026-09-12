import type { RunScope } from '@/db'
import { answerOptions, questions } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { EntityIds, IdMap } from './entity-ids'
import { writeAnswerEffects } from './write-answer-effects'

export const upsertQuestions = async (
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
  refs: EntityIds,
): Promise<void> => {
  for (const [chapter, list] of config.questions) {
    const chapterId = refs.chapterIds.get(chapter)
    if (!chapterId) continue

    for (const question of list) {
      const characterId = question.characterId ? refs.characterIds.get(question.characterId) : undefined
      if (!characterId) continue

      const values = {
        chapterId,
        characterId,
        ordinal: question.ordinal,
        type: question.type,
        source: question.source,
        isPaired: question.isPaired,
        text: question.text,
        scaleId:
          question.type === 'scale_direct' && question.scaleKey
            ? (refs.scaleIds.get(question.scaleKey) ?? null)
            : null,
        allowOther: question.options.some((o) => o.isOther),
        sourceConfigVersionId: versionId,
      }
      await scope
        .insert(questions, { externalId: question.externalId, ...values })
        .onConflictDoUpdate({ target: [questions.runId, questions.externalId], set: values })
    }
  }

  const questionRows = await scope.select(questions)
  const questionIds = new Map(questionRows.map((row) => [row.externalId, row.id]))
  const optionIds = await upsertAnswerOptions(scope, config, refs.characterIds, questionIds)

  await writeAnswerEffects(scope, config, refs, optionIds, versionId)
}

const upsertAnswerOptions = async (
  scope: RunScope,
  config: ParsedConfig,
  characterIds: IdMap,
  questionIds: IdMap,
): Promise<IdMap> => {
  for (const list of config.questions.values()) {
    for (const question of list) {
      const questionId = questionIds.get(question.externalId)
      if (!questionId) continue

      for (const option of question.options) {
        const values = {
          questionId,
          ordinal: option.ordinal,
          label: option.label,
          referencedCharacterId: option.referencedCharacter
            ? (characterIds.get(option.referencedCharacter) ?? null)
            : null,
          isOther: option.isOther,
        }
        await scope
          .insert(answerOptions, { externalId: option.externalId, ...values })
          .onConflictDoUpdate({ target: [answerOptions.runId, answerOptions.externalId], set: values })
      }
    }
  }

  const rows = await scope.select(answerOptions)

  return new Map(rows.map((row) => [row.externalId, row.id]))
}
