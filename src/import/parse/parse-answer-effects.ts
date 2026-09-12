import { ANSWER_EFFECTS } from '../constants/sheet-vocabulary'
import type { IssueCollector } from '../issue-collector'
import type { IssueLocation } from '../types/issue'
import type { ParsedAnswerEffect } from '../types/parsed-question'
import { splitList } from '../utils/split-list'

/** `NAZEV(argument)` in the `Effects` column. */
const EFFECT_CALL = /^([A-Z_]+)\(([^)]*)\)$/

export const parseAnswerEffects = (
  cell: string,
  answerId: string,
  location: IssueLocation,
  issues: IssueCollector,
): ParsedAnswerEffect[] => {
  const effects: ParsedAnswerEffect[] = []

  for (const raw of splitList(cell)) {
    const match = EFFECT_CALL.exec(raw)
    if (!match) {
      issues.error(
        'chybejici_hodnota',
        location,
        `Efekt „${raw}" u odpovědi \`${answerId}\` se nedá přečíst — čeká se tvar \`NAZEV(argument)\`, například \`SNATEK(Mirek)\`.`,
        { value: raw },
      )
      continue
    }

    const name = match[1] ?? ''
    const argument = match[2] ?? ''
    if (!(ANSWER_EFFECTS as readonly string[]).includes(name)) {
      issues.error(
        'chybejici_hodnota',
        location,
        `Neznámý efekt \`${name}\` u odpovědi \`${answerId}\` — k dispozici jsou ${ANSWER_EFFECTS.join(', ')}.`,
        { value: name },
      )
      continue
    }
    effects.push({ name, argument: argument.trim(), raw })
  }

  return effects
}
