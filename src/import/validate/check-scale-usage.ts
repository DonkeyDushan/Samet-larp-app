import type { IssueCollector } from '../issue-collector'
import { accountCounterpart, splitScaleId } from '../scale-impact'
import type { ParsedConfig } from '../types/parsed-config'

/** Scale keys the chapter's answers move. */
const touchedScaleKeys = (config: ParsedConfig, chapter: number): Set<string> => {
  const touched = new Set<string>()
  for (const question of config.questions.get(chapter) ?? []) {
    for (const option of question.options) {
      for (const impact of option.impacts) touched.add(impact.scale)
    }
  }

  return touched
}

/**
 * §11.9: in a chapter where answers touch one half of an `_osobni` /
 * `_spolecny` pair and never the other, the missing half is almost certainly a
 * typo in a scale ID rather than a deliberate choice.
 */
export const checkAccountPairs = (config: ParsedConfig, issues: IssueCollector): void => {
  for (const [chapter, scales] of config.scales) {
    const touched = touchedScaleKeys(config, chapter)
    const defined = new Set(scales.map((s) => s.key))

    for (const scale of scales) {
      const counterpart = accountCounterpart(scale.key)
      if (!counterpart || !defined.has(counterpart)) continue

      if (touched.has(scale.key) && !touched.has(counterpart)) {
        issues.warn(
          'osamely_ucet',
          scale.location,
          `V kapitole ${chapter} sahá nějaká odpověď na \`${scale.key}\`, ale na protějšek \`${counterpart}\` ne — skoro jistě překlep v ID škály.`,
          { value: counterpart },
        )
      }
    }
  }
}

/** §11: a scale nothing ever moves is either dead weight or a misspelled ID. */
export const checkUntouchedScales = (config: ParsedConfig, issues: IssueCollector): void => {
  for (const [chapter, scales] of config.scales) {
    const touched = touchedScaleKeys(config, chapter)
    const read = new Set<string>()
    for (const block of config.blocks.get(chapter) ?? []) {
      for (const variation of block.variations) {
        for (const reference of variation.condition.references) {
          if (reference.kind !== 'skala') continue
          const scale = splitScaleId(reference.name)?.scale
          if (scale) read.add(scale)
        }
      }
    }

    for (const scale of scales) {
      if (!touched.has(scale.key) && !read.has(scale.key)) {
        issues.warn(
          'skala_bez_dopadu',
          scale.location,
          `Se škálou \`${scale.key}\` v kapitole ${chapter} nic nehýbe a žádná podmínka ji nečte — buď je zbytečná, nebo je někde překlep v jejím ID.`,
          { value: scale.key },
        )
      }
    }
  }
}
