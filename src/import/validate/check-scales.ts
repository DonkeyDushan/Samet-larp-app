import { MERGE_STRATEGIES, SPLIT_STRATEGIES } from '../constants/scale-defaults'
import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedScale } from '../types/parsed-scale'

export const checkScales = (config: ParsedConfig, issues: IssueCollector): void => {
  for (const [chapter, scales] of config.scales) {
    for (const scale of scales) {
      // §4.4: a shared scale without both strategies cannot survive a
      // marriage or a divorce, and the engine must never invent one.
      if (scale.scope === 'domacnost' && (!scale.mergeStrategy || !scale.splitStrategy)) {
        const missing = [
          scale.mergeStrategy ? undefined : '`Slouceni`',
          scale.splitStrategy ? undefined : '`Rozdeleni`',
        ]
          .filter(Boolean)
          .join(' a ')
        issues.error(
          'domacnostni_skala_bez_strategie',
          scale.location,
          `Domácnostní škála \`${scale.key}\` (kapitola ${chapter}) nemá vyplněno ${missing} — bez strategie se nedá sloučit při sňatku ani rozdělit při rozvodu.`,
          { value: scale.key },
        )
      }

      if (scale.mergeStrategy && !MERGE_STRATEGIES.includes(scale.mergeStrategy)) {
        issues.error(
          'chybejici_hodnota',
          scale.location,
          `Škála \`${scale.key}\` má neznámou strategii sloučení „${scale.mergeStrategy}" — čeká se ${MERGE_STRATEGIES.join(', ')}.`,
          { value: scale.mergeStrategy },
        )
      }
      if (scale.splitStrategy && !SPLIT_STRATEGIES.includes(scale.splitStrategy)) {
        issues.error(
          'chybejici_hodnota',
          scale.location,
          `Škála \`${scale.key}\` má neznámou strategii rozdělení „${scale.splitStrategy}" — čeká se ${SPLIT_STRATEGIES.join(', ')}.`,
          { value: scale.splitStrategy },
        )
      }

      checkBands(scale, chapter, issues)
    }
  }
}

const checkBands = (scale: ParsedScale, chapter: number, issues: IssueCollector): void => {
  const sorted = [...scale.bands].sort((a, b) => a.min - b.min)

  sorted.forEach((band, index) => {
    if (band.min < scale.min || band.max > scale.max) {
      issues.error(
        'hodnota_mimo_rozsah',
        scale.location,
        `Pásmo ${band.min}–${band.max} škály \`${scale.key}\` (kapitola ${chapter}) přesahuje rozsah škály ${scale.min}–${scale.max}.`,
        { value: `${band.min}-${band.max}` },
      )
    }

    const next = sorted[index + 1]
    if (next && next.min <= band.max) {
      issues.error(
        'hodnota_mimo_rozsah',
        scale.location,
        `Pásma škály \`${scale.key}\` se překrývají: ${band.min}–${band.max} a ${next.min}–${next.max}.`,
        { value: scale.key },
      )
    }
    if (next && next.min > band.max + 1) {
      issues.warn(
        'hodnota_mimo_rozsah',
        scale.location,
        `Mezi pásmy škály \`${scale.key}\` je díra: hodnoty ${band.max + 1}–${next.min - 1} nepatří do žádného pásma.`,
        { value: scale.key },
      )
    }
  })
}
