import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import { suggestClosest } from '../utils/suggest-closest'

/** Chapter whose scale bounds the `Characters` starting values are checked against. */
const INITIAL_VALUES_CHAPTER = 1

export const checkCharacters = (config: ParsedConfig, issues: IssueCollector): void => {
  for (const character of config.characters) {
    if (character.templateExternalId === '') {
      issues.error(
        'postava_bez_sablony',
        character.location,
        `Postava \`${character.externalId}\` nemá ve sloupci \`Template ID\` přiřazenou šablonu dokumentu.`,
        { value: character.externalId },
      )
    }
    if (character.firstName === '') {
      issues.warn(
        'chybejici_hodnota',
        character.location,
        `Postava \`${character.externalId}\` nemá jméno — v dokumentech se \`{JMENO}\` rozvine naprázdno.`,
      )
    }
  }

  const firstChapterScales = config.scales.get(INITIAL_VALUES_CHAPTER) ?? []
  const boundsByKey = new Map(firstChapterScales.map((s) => [s.key, s]))
  const knownKeys = [...boundsByKey.keys()]

  for (const character of config.characters) {
    for (const [key, entry] of Object.entries(character.initialScales)) {
      const scale = boundsByKey.get(key)
      if (!scale) {
        if (firstChapterScales.length === 0) continue
        issues.error(
          'neznama_skala',
          entry.location,
          `Sloupec \`S_${key}\` v listu \`Characters\` odkazuje na škálu \`${key}\`, která není definovaná v listu \`1_Scales\`.`,
          { value: key, suggestion: suggestClosest(key, knownKeys) },
        )
        continue
      }
      if (entry.value < scale.min || entry.value > scale.max) {
        issues.error(
          'hodnota_mimo_rozsah',
          entry.location,
          `Počáteční hodnota ${entry.value} škály \`${key}\` u postavy \`${character.externalId}\` je mimo rozsah ${scale.min}–${scale.max}.`,
          { value: String(entry.value) },
        )
      }
    }
  }
}
