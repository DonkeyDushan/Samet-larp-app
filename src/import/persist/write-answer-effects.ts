/**
 * Layers 1 and 2 (§4.5) end up in the same `effects` table as rules do, owned
 * by the answer option — so adding them is not a new branch in the engine.
 *
 * Effects have no source ID of their own, so an answer's effects are rewritten
 * as a set: they are derived data, fully reproducible from the sheet.
 */
import type { RunScope } from '@/db'
import { effects } from '@/db/schema'
import type { STRUCTURAL_EFFECT_KINDS } from '@/engine'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedAnswerOption } from '../types/parsed-question'
import type { EntityIds, IdMap } from './entity-ids'

type EffectRow = typeof effects.$inferInsert
type EffectPayload = Omit<EffectRow, 'runId' | 'externalId' | 'sourceConfigVersionId' | 'ordinal' | 'answerOptionId'>

/** Sheet effect names (`SNATEK(Mirek)`) to engine effect kinds. */
const STRUCTURAL_EFFECTS: Readonly<Record<string, (typeof STRUCTURAL_EFFECT_KINDS)[number]>> = Object.freeze({
  SNATEK: 'domacnost_slouceni',
  ROZVOD: 'domacnost_rozdeleni',
  VEDENI: 'vedeni',
  CLENSTVI: 'clenstvi',
})

export const writeAnswerEffects = async (
  scope: RunScope,
  config: ParsedConfig,
  refs: EntityIds,
  optionIds: IdMap,
  versionId: string,
): Promise<void> => {
  for (const list of config.questions.values()) {
    for (const question of list) {
      for (const option of question.options) {
        const optionId = optionIds.get(option.externalId)
        if (!optionId) continue

        const payloads = effectPayloads(option, refs)
        for (const [ordinal, payload] of payloads.entries()) {
          const row: EffectRow = {
            runId: scope.runId,
            answerOptionId: optionId,
            externalId: `${option.externalId}#${ordinal}`,
            sourceConfigVersionId: versionId,
            ordinal,
            ...payload,
          }
          await scope.insert(effects, row).onConflictDoUpdate({
            target: [effects.runId, effects.externalId],
            // Drizzle cannot type `set` over the generic insert; keys are the table's own.
            set: { ...row, runId: undefined, externalId: undefined } as never,
          })
        }
      }
    }
  }
}

const effectPayloads = (option: ParsedAnswerOption, refs: EntityIds): EffectPayload[] => {
  const payloads: EffectPayload[] = []

  for (const impact of option.impacts) {
    const scaleId = refs.scaleIds.get(impact.scale)
    if (!scaleId) continue

    payloads.push({
      kind: impact.mode === 'absolutni' ? 'nastaveni_skaly' : 'zmena_skaly',
      characterId: refs.characterIds.get(impact.character) ?? null,
      scaleId,
      scaleDelta: impact.mode === 'posun' ? (impact.delta ?? 0) : null,
      // `=VALUE` takes the number from the answer, so nothing is stored here.
      scaleSetValue: impact.mode === 'absolutni' ? (impact.value ?? null) : null,
    })
  }

  for (const blockId of option.blocks) {
    payloads.push({ kind: 'blok', blockExternalId: blockId })
  }

  for (const flag of option.flags) {
    const flagId = refs.flagIds.get(flag)
    if (flagId) payloads.push({ kind: 'priznak', flagId, flagValue: true })
  }

  for (const effect of option.effects) {
    const kind = STRUCTURAL_EFFECTS[effect.name]
    // §7.3: the partner comes from whoever the chosen option names, so the
    // author does not write a rule per pair of 23 characters.
    if (kind) payloads.push({ kind, relatedFromAnswer: true })
  }

  return payloads
}
