import { RUN_LETTERS } from '../constants/run-letters'

export type RunLetterUse = { startDate: string; letter: string }

/** Letters restart at `A` for every start date; archived runs still hold theirs, so IDs never repeat (§3.2). */
export const nextRunLetter = (existing: readonly RunLetterUse[], startDate: string): string | undefined => {
  const taken = new Set<string>()
  for (const run of existing) {
    if (run.startDate === startDate) taken.add(run.letter)
  }

  return RUN_LETTERS.find((letter) => !taken.has(letter))
}
