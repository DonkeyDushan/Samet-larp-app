/**
 * Lookups over the config, built once per `evaluate`, and the checks that make
 * the rest of the engine safe to write without defensive branches.
 */
import { SCALE_PREFIX, SCALE_ID_SEPARATOR } from '../constants/expressionLanguage'
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { EngineConfig } from '../types/config'
import type { CharacterDefinition } from '../types/character'
import type { CharacterRef, EffectDefinition } from '../types/effect'
import type { AnswerOptionId, CharacterId, FlagId, GroupId, QuestionId, ScaleKey } from '../types/ids'
import type { AnswerOptionDefinition, QuestionDefinition } from '../types/question'
import type { ScaleDefinition } from '../types/scale'
import { compareIds } from '../utils/compareIds'

export interface OptionEntry {
  question: QuestionDefinition
  option: AnswerOptionDefinition
}

export interface Catalog {
  config: EngineConfig
  /** Sorted, so iteration never follows row order in the sheet. */
  characterIds: CharacterId[]
  characters: Map<CharacterId, CharacterDefinition>
  groupIds: GroupId[]
  scales: Map<ScaleKey, ScaleDefinition>
  /** `S_Marie_Wealth_osobni` → Marie + `Wealth_osobni`. */
  scaleReferences: Map<string, { characterId: CharacterId; scaleKey: ScaleKey }>
  questions: Map<QuestionId, QuestionDefinition>
  options: Map<AnswerOptionId, OptionEntry>
  /** Flags are never declared (§4.2): they exist by being set somewhere. */
  flags: Set<FlagId>
}

const indexUnique = <T>(items: T[], idOf: (item: T) => string, problems: EngineProblem[]): Map<string, T> => {
  const index = new Map<string, T>()
  for (const item of items) {
    const id = idOf(item)
    if (index.has(id)) problems.push({ code: 'duplicitni_id', subject: id, detail: 'appears twice in the config' })
    index.set(id, item)
  }

  return index
}

export const buildCatalog = (config: EngineConfig): Catalog => {
  const problems: EngineProblem[] = []

  const characters = indexUnique(config.characters, (character) => character.id, problems)
  const groups = new Set(config.groups)
  const scales = indexUnique(config.scales, (scale) => scale.key, problems)
  const questions = indexUnique(config.questions, (question) => question.id, problems)
  indexUnique(config.blocks, (block) => block.id, problems)
  indexUnique(config.blocks.flatMap((block) => block.variations), (variation) => variation.id, problems)
  indexUnique(config.rules, (rule) => rule.id, problems)

  const missing = (subject: string, detail: string): void => {
    problems.push({ code: 'neznamy_odkaz', subject, detail })
  }

  const checkCharacter = (characterId: CharacterId | undefined, owner: string): void => {
    if (characterId !== undefined && !characters.has(characterId)) missing(owner, `unknown character ${characterId}`)
  }

  for (const scale of config.scales) {
    if (scale.scope === 'domacnost' && (!scale.mergeStrategy || !scale.splitStrategy)) {
      missing(scale.key, 'household scale needs both a merge and a split strategy')
    }
  }

  for (const character of config.characters) {
    if (character.groupId !== undefined && !groups.has(character.groupId)) {
      missing(character.id, `unknown group ${character.groupId}`)
    }
    for (const [scaleKey, value] of Object.entries(character.initialScales)) {
      const scale = scales.get(scaleKey)
      if (!scale) missing(character.id, `initial value of unknown scale ${scaleKey}`)
      else if (!Number.isInteger(value) || value < scale.min || value > scale.max) {
        missing(character.id, `initial ${scaleKey} = ${value} is outside ${scale.min}–${scale.max}`)
      }
    }
  }

  const flags = new Set<FlagId>()

  const checkRef = (ref: CharacterRef | undefined, owner: string, referenced: CharacterId | undefined, fromAnswerAllowed: boolean): void => {
    if (ref?.from === 'postava') checkCharacter(ref.characterId, owner)
    if (ref?.from !== 'odpoved') return
    if (!fromAnswerAllowed) missing(owner, 'only an answer option can take a character from the answer')
    else if (referenced === undefined) missing(owner, 'takes a character from the answer, but the option names none')
  }

  const checkEffect = (effect: EffectDefinition, owner: string, referenced: CharacterId | undefined, fromAnswerAllowed: boolean): void => {
    checkRef(effect.character, owner, referenced, fromAnswerAllowed)
    switch (effect.kind) {
      case 'zmena_skaly': {
        if (!scales.has(effect.scaleKey)) missing(owner, `unknown scale ${effect.scaleKey}`)
        const weighted = effect.delta * (effect.weight ?? 1)
        // Rounding would make the numbers in the document a guess.
        if (!Number.isInteger(weighted)) missing(owner, `weighted shift ${weighted} on ${effect.scaleKey} is not a whole number`)
        break
      }
      case 'nastaveni_skaly': {
        const scale = scales.get(effect.scaleKey)
        if (!scale) missing(owner, `unknown scale ${effect.scaleKey}`)
        else if (typeof effect.value === 'number' && (effect.value < scale.min || effect.value > scale.max)) {
          missing(owner, `sets ${effect.scaleKey} to ${effect.value}, outside ${scale.min}–${scale.max}`)
        }
        break
      }
      case 'priznak':
        flags.add(effect.flagId)
        break
      case 'domacnost_slouceni':
        checkRef(effect.partner, owner, referenced, fromAnswerAllowed)
        break
      case 'domacnost_rozdeleni':
        checkRef(effect.partner, owner, referenced, fromAnswerAllowed)
        break
      case 'clenstvi':
      case 'vedeni':
        if (!groups.has(effect.groupId)) missing(owner, `unknown group ${effect.groupId}`)
        break
    }
  }

  const options = new Map<AnswerOptionId, OptionEntry>()
  for (const question of config.questions) {
    checkCharacter(question.characterId, question.id)
    for (const option of question.options) {
      if (options.has(option.id)) problems.push({ code: 'duplicitni_id', subject: option.id, detail: 'appears twice in the config' })
      options.set(option.id, { question, option })
      checkCharacter(option.referencedCharacterId, option.id)
      for (const effect of option.effects) checkEffect(effect, option.id, option.referencedCharacterId, true)
    }
  }

  for (const rule of config.rules) {
    checkCharacter(rule.characterId, rule.id)
    for (const effect of rule.effects) checkEffect(effect, rule.id, undefined, false)
  }

  for (const block of config.blocks) checkCharacter(block.characterId, block.id)

  failIfAny(problems)

  const characterIds = [...characters.keys()].sort(compareIds)
  const scaleReferences = new Map<string, { characterId: CharacterId; scaleKey: ScaleKey }>()
  for (const characterId of characterIds) {
    for (const scaleKey of scales.keys()) {
      scaleReferences.set(`${SCALE_PREFIX}${characterId}${SCALE_ID_SEPARATOR}${scaleKey}`, { characterId, scaleKey })
    }
  }

  return {
    config,
    characterIds,
    characters,
    groupIds: [...groups].sort(compareIds),
    scales,
    scaleReferences,
    questions,
    options,
    flags,
  }
}
