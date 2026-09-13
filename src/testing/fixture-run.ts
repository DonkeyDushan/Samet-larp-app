/**
 * `documents/fixture-platny.xlsx` as an engine run: the config from the workbook
 * plus a made-up set of answers for chapters 1 and 2 (the fixture has none).
 * Shared by the engine tests and `scripts/engine-demo.ts`.
 */
import { readFileSync } from 'node:fs'
import { createInitialState, evaluate, type AnswerInput, type EngineConfig, type EvaluateResult, type RollInput } from '@/engine'
import { importXlsx } from '@/import/import-config'
import { toEngineConfig } from '@/import/to-engine-config'

/** Relative to the repository root, where tests and scripts run. */
export const FIXTURE_PATH = 'documents/fixture-platny.xlsx'

export const loadFixtureConfig = (): EngineConfig => {
  const result = importXlsx(readFileSync(FIXTURE_PATH))
  if (!result.usable) {
    throw new Error(`${FIXTURE_PATH} does not import cleanly: ${result.errors.map((issue) => issue.message).join('; ')}`)
  }

  return toEngineConfig(result.config)
}

export const choose = (questionId: string, ...selectedOptionIds: string[]): AnswerInput => ({
  questionId,
  selectedOptionIds,
  filledByOrg: false,
})

export const setValue = (questionId: string, numericValue: number): AnswerInput => ({
  questionId,
  selectedOptionIds: [],
  numericValue,
  filledByOrg: false,
})

/** Org questions (§6.7) are entered by the org. */
const byOrg = (answer: AnswerInput): AnswerInput => ({ ...answer, filledByOrg: true })

/** Marie leads the shift and sets her savings; Karel informs, Věra joins the party. */
export const chapter1Answers = (): AnswerInput[] => [
  choose('Q_Marie_1_1', 'A_Marie_1_1_Marie'),
  setValue('Q_Marie_1_2', 3),
  choose('Q_Mirek_1_1', 'A_Mirek_1_1_Ano'),
  choose('Q_Karel_1_1', 'A_Karel_1_1_Ano'),
  choose('Q_Vera_1_1', 'A_Vera_1_1_Ano'),
  choose('Q_Rudi_1_1', 'A_Rudi_1_1_Ano'),
]

/** Marie marries Mirek and the org sets both accounts; Karel is promoted, Věra keeps working. */
export const chapter2Answers = (): AnswerInput[] => [
  byOrg(choose('Q_Marie_2_1', 'A_Marie_2_1_Mirek')),
  byOrg(setValue('Q_Marie_2_2', 3)),
  byOrg(setValue('Q_Marie_2_3', 8)),
  choose('Q_Marie_2_4', 'A_Marie_2_4_Ano'),
  byOrg(setValue('Q_Mirek_2_1', 5)),
  choose('Q_Karel_2_1', 'A_Karel_2_1_Ano'),
  choose('Q_Vera_2_1', 'A_Vera_2_1_Ne'),
  choose('Q_Rudi_2_1', 'A_Rudi_2_1_Ano'),
]

export interface FixtureRunOptions {
  config?: EngineConfig
  chapter2Answers?: AnswerInput[]
  chapter2Rolls?: RollInput[]
}

export interface FixtureRun {
  config: EngineConfig
  chapter1: EvaluateResult
  chapter2: EvaluateResult
}

export const runFixture = (options: FixtureRunOptions = {}): FixtureRun => {
  const config = options.config ?? loadFixtureConfig()
  const chapter1 = evaluate(createInitialState(config), { chapter: 1, answers: chapter1Answers(), rolls: [] }, config)
  const chapter2 = evaluate(
    chapter1.state,
    {
      chapter: 2,
      answers: [...chapter1Answers(), ...(options.chapter2Answers ?? chapter2Answers())],
      rolls: options.chapter2Rolls ?? [],
    },
    config,
  )

  return { config, chapter1, chapter2 }
}
