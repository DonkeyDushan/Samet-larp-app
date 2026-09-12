import type { RunScope } from '@/db'
import { answerOptions, questions } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { EntityIds, IdMap } from './entity-ids'
import { writeAnswerEffects } from './write-answer-effects'
import type { WrittenRows } from './written-rows'

export const upsertQuestions = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  refs: EntityIds,
): Promise<void> => {
  const questionIds: IdMap = new Map()

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
      }
      const [row] = await scope
        .insert(questions, { externalId: question.externalId, ...values })
        .onConflictDoUpdate({ target: [questions.runId, questions.externalId], set: values })
        .returning({ id: questions.id })
      if (!row) continue

      written.questions.add(row.id)
      questionIds.set(question.externalId, row.id)
    }
  }

  const optionIds = await upsertAnswerOptions(scope, config, written, refs.characterIds, questionIds)

  await writeAnswerEffects(scope, config, written, refs, optionIds)
}

const upsertAnswerOptions = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  characterIds: IdMap,
  questionIds: IdMap,
): Promise<IdMap> => {
  const optionIds: IdMap = new Map()

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
        const [row] = await scope
          .insert(answerOptions, { externalId: option.externalId, ...values })
          .onConflictDoUpdate({ target: [answerOptions.runId, answerOptions.externalId], set: values })
          .returning({ id: answerOptions.id })
        if (!row) continue

        written.answerOptions.add(row.id)
        optionIds.set(option.externalId, row.id)
      }
    }
  }

  return optionIds
}
