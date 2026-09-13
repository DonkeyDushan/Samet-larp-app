/**
 * Phase 1, collecting answers. There are no default answers (§6.3): a missing
 * or malformed answer stops the computation, and every problem is listed at once.
 */
import type { Catalog } from '../catalog/buildCatalog'
import { IMPLICIT_OPTION_TYPES, SINGLE_CHOICE_TYPES } from '../constants/effectDefaults'
import { VALUE_FROM_ANSWER } from '../constants/identifiers'
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { AnswerOptionId, ChapterNumber, QuestionId } from '../types/ids'
import type { AnswerInput } from '../types/input'
import type { QuestionDefinition } from '../types/question'
import { compareIds } from '../utils/compareIds'

export interface AnswerIndex {
  byQuestion: Map<QuestionId, AnswerInput>
  /** Selected options, plus every option of `scale_direct` and `text` questions. */
  chosen: Set<AnswerOptionId>
}

type Report = (subject: string, detail: string) => void

const checkNumericValue = (question: QuestionDefinition, answer: AnswerInput, report: Report, catalog: Catalog): void => {
  const value = answer.numericValue
  if (value === undefined || !Number.isInteger(value)) {
    report(question.id, 'scale_direct needs a whole number')

    return
  }

  for (const option of question.options) {
    for (const effect of option.effects) {
      if (effect.kind !== 'nastaveni_skaly' || effect.value !== VALUE_FROM_ANSWER) continue
      const scale = catalog.scales.get(effect.scaleKey)
      if (scale && (value < scale.min || value > scale.max)) {
        report(question.id, `${value} is outside ${effect.scaleKey} ${scale.min}–${scale.max}`)
      }
    }
  }
}

const chosenOptionIds = (question: QuestionDefinition, answer: AnswerInput, report: Report, catalog: Catalog): AnswerOptionId[] => {
  if ((IMPLICIT_OPTION_TYPES as readonly string[]).includes(question.type)) {
    if (answer.selectedOptionIds.length > 0) report(question.id, `${question.type} selects no option`)
    if (question.type === 'scale_direct') checkNumericValue(question, answer, report, catalog)

    return question.options.map((option) => option.id)
  }

  const known = new Set(question.options.map((option) => option.id))
  for (const optionId of answer.selectedOptionIds) {
    if (!known.has(optionId)) report(question.id, `option ${optionId} does not belong to the question`)
  }
  if (new Set(answer.selectedOptionIds).size !== answer.selectedOptionIds.length) {
    report(question.id, 'an option is selected twice')
  }
  if ((SINGLE_CHOICE_TYPES as readonly string[]).includes(question.type) && answer.selectedOptionIds.length !== 1) {
    report(question.id, `${question.type} needs exactly one option, got ${answer.selectedOptionIds.length}`)
  }

  return answer.selectedOptionIds
}

export const indexAnswers = (answers: AnswerInput[], catalog: Catalog, chapter: ChapterNumber): AnswerIndex => {
  const problems: EngineProblem[] = []
  const report: Report = (subject, detail) => problems.push({ code: 'neplatna_odpoved', subject, detail })

  const byQuestion = new Map<QuestionId, AnswerInput>()
  const chosen = new Set<AnswerOptionId>()

  for (const answer of answers) {
    const question = catalog.questions.get(answer.questionId)
    if (!question) {
      report(answer.questionId, 'answer to an unknown question')
      continue
    }
    if (question.chapter > chapter) {
      report(question.id, `answer to chapter ${question.chapter} while computing chapter ${chapter}`)
      continue
    }
    if (byQuestion.has(question.id)) {
      report(question.id, 'answered twice')
      continue
    }

    byQuestion.set(question.id, answer)
    for (const optionId of chosenOptionIds(question, answer, report, catalog)) chosen.add(optionId)
  }

  const unanswered = [...catalog.questions.values()]
    .filter((question) => question.chapter === chapter && !byQuestion.has(question.id))
    .sort((a, b) => compareIds(a.id, b.id))
  for (const question of unanswered) {
    problems.push({ code: 'chybi_odpoved', subject: question.id, detail: `${question.characterId} has not answered` })
  }

  failIfAny(problems)

  return { byQuestion, chosen }
}
