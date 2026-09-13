/**
 * `ParsedConfig` to the engine's config, so an uploaded workbook can be
 * computed without the database — the fixture tests and a dry run need that.
 *
 * Expects a config the import found usable; anything it still cannot map is a
 * bug, so it throws rather than dropping data.
 */
import {
  CHAPTER_NUMBERS,
  VALUE_FROM_ANSWER,
  type ChapterNumber,
  type EffectDefinition,
  type EngineConfig,
  type MergeStrategy,
  type ScaleDefinition,
  type SplitStrategy,
} from '@/engine'
import { ANSWER_EFFECT_KINDS } from './constants/answer-effect-kinds'
import type { ParsedConfig } from './types/parsed-config'
import type { ParsedAnswerEffect, ParsedAnswerOption } from './types/parsed-question'

const unmappable = (subject: string, detail: string): never => {
  throw new Error(`Cannot hand ${subject} to the engine: ${detail}.`)
}

const toChapter = (chapter: number): ChapterNumber =>
  CHAPTER_NUMBERS.find((known) => known === chapter) ?? unmappable(`chapter ${chapter}`, 'not a game chapter')

const toMergeStrategy = (value: string | undefined): MergeStrategy | undefined => {
  switch (value) {
    case 'soucet':
    case 'prumer':
    case 'vyssi':
    case 'otazka':
      return value
    default:
      return undefined
  }
}

const toSplitStrategy = (value: string | undefined): SplitStrategy | undefined => {
  switch (value) {
    case 'kopie':
    case 'polovina':
    case 'otazka':
      return value
    default:
      return undefined
  }
}

const structuralEffect = (effect: ParsedAnswerEffect, option: ParsedAnswerOption): EffectDefinition => {
  const kind = ANSWER_EFFECT_KINDS[effect.name]
  switch (kind) {
    case 'domacnost_slouceni':
    case 'domacnost_rozdeleni':
      return { kind, partner: { from: 'odpoved' } }
    case 'vedeni':
      // The leader is whoever the option names; an option naming nobody means the answering character.
      if (option.referencedCharacter === undefined) return { kind, groupId: effect.argument }

      return { kind, groupId: effect.argument, character: { from: 'odpoved' } }
    case 'clenstvi':
      return { kind, groupId: effect.argument, action: 'pridat' }
    default:
      return unmappable(option.externalId, `effect ${effect.raw} has no engine meaning`)
  }
}

const optionEffects = (option: ParsedAnswerOption): EffectDefinition[] => {
  const effects: EffectDefinition[] = []

  for (const impact of option.impacts) {
    const character = { from: 'postava', characterId: impact.character } as const
    if (impact.mode === 'posun') {
      effects.push({ kind: 'zmena_skaly', character, scaleKey: impact.scale, delta: impact.delta ?? unmappable(impact.raw, 'shift without a number') })
      continue
    }
    const value = impact.fromAnswer ? VALUE_FROM_ANSWER : (impact.value ?? unmappable(impact.raw, 'setting without a value'))
    effects.push({ kind: 'nastaveni_skaly', character, scaleKey: impact.scale, value })
  }

  for (const flagId of option.flags) effects.push({ kind: 'priznak', flagId, value: true })
  for (const effect of option.effects) effects.push(structuralEffect(effect, option))

  return effects
}

/** Scales are defined per chapter in the sheet but per run in the engine; a later chapter's definition wins. */
const collectScales = (config: ParsedConfig): ScaleDefinition[] => {
  const scales = new Map<string, ScaleDefinition>()

  for (const chapter of [...config.chapters].sort((a, b) => a - b)) {
    for (const scale of config.scales.get(chapter) ?? []) {
      scales.set(scale.key, {
        key: scale.key,
        scope: scale.scope,
        min: scale.min,
        max: scale.max,
        bands: scale.bands.map((band) => ({ ordinal: band.ordinal, min: band.min, max: band.max, name: band.name })),
        mergeStrategy: toMergeStrategy(scale.mergeStrategy),
        splitStrategy: toSplitStrategy(scale.splitStrategy),
      })
    }
  }

  return [...scales.values()]
}

export const toEngineConfig = (config: ParsedConfig): EngineConfig => ({
  characters: config.characters.map((character) => ({
    id: character.externalId,
    groupId: character.groupName === '' ? undefined : character.groupName,
    initialScales: Object.fromEntries(Object.entries(character.initialScales).map(([key, entry]) => [key, entry.value])),
  })),
  groups: config.groups.map((group) => group.name),
  scales: collectScales(config),
  questions: [...config.questions.values()].flat().map((question) => ({
    id: question.externalId,
    chapter: toChapter(question.chapter),
    characterId: question.characterId ?? unmappable(question.externalId, `unknown character ${question.characterRef}`),
    type: question.type,
    options: question.options.map((option) => ({
      id: option.externalId,
      referencedCharacterId: option.referencedCharacter,
      effects: optionEffects(option),
    })),
  })),
  blocks: [...config.blocks.values()].flat().map((block) => ({
    id: block.externalId,
    chapter: toChapter(block.chapter),
    characterId: block.characterId ?? unmappable(block.externalId, `unknown character ${block.characterRef}`),
    variations: block.variations.map((variation) => ({
      id: variation.externalId,
      priority: variation.priority,
      condition: variation.condition.raw,
      text: variation.text,
    })),
  })),
  // The sheet has no `N_Rules` yet (§4.5).
  rules: [],
})
