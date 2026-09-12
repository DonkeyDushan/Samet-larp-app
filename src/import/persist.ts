/**
 * Writing a checked config into the database (§6.5, §10.2).
 *
 * Three rules shape this file:
 *
 *  - **Every import is a new version.** `config_versions` grows; nothing is
 *    ever replaced. A version carries the import report and the diff, so the
 *    admin screen can show what an import did long after the fact.
 *  - **A new version does not change a running game by itself** (§6.5). The
 *    version is written inactive and the org activates it deliberately, which
 *    goes into the audit.
 *  - **Nothing is deleted.** Config entities live per run keyed by their source
 *    ID (the schema's unique constraints say so), so a re-import updates them
 *    in place and stamps `source_config_version_id` with the new version.
 *    An entity the sheet no longer carries keeps its old stamp and so drops out
 *    of the active set without a single delete.
 *
 * All access goes through `forRun(runId)` — architecture rule 2.
 */
import { eq } from 'drizzle-orm'
import { forRun, type RunScope } from '@/db'
import {
  answerOptions,
  auditLog,
  blockVariations,
  characterScales,
  characters,
  chapters as chaptersTable,
  configVersions,
  contentBlocks,
  effects,
  flags,
  groups,
  questions,
  scaleBands,
  scales,
} from '@/db/schema'
import { configSnapshot, diffSnapshots, type ConfigDiff, type EntitySnapshot } from './diff'
import { fingerprintConfig } from './fingerprint'
import type { Issue } from './issues'
import type { ParsedConfig } from './types'

export interface PersistInput {
  runId: string
  config: ParsedConfig
  issues: Issue[]
  sourceFilename: string
  /** Free-text name from the „Kdo jsi?" field (§3.1). */
  author: string
  note?: string
}

export interface PersistResult {
  configVersionId: string
  version: number
  diff: ConfigDiff
  /** True when an identical version already existed and nothing was written. */
  alreadyImported: boolean
}

/**
 * Writes a new config version. Refuses a config with errors: a broken config
 * must never reach the database, only the report (§10.2).
 */
export async function persistConfig(input: PersistInput): Promise<PersistResult> {
  if (input.issues.some((i) => i.severity === 'chyba')) {
    throw new Error(
      'Konfigurace obsahuje chyby a nedá se uložit. Oprav je v tabulce a nahraj soubor znovu.',
    )
  }

  const run = forRun(input.runId)
  const hash = fingerprintConfig(input.config)
  const snapshot = configSnapshot(input.config)

  return run.transaction(async (scope) => {
    const diff = diffSnapshots(await latestSnapshot(scope), snapshot)

    const existing = await scope.select(configVersions, eq(configVersions.sourceHash, hash))
    if (existing.length > 0) {
      // Re-uploading the same sheet must not duplicate anything (§10.2).
      const version = existing[0]!
      return {
        configVersionId: version.id,
        version: version.version,
        diff,
        alreadyImported: true,
      }
    }

    const versions = await scope.select(configVersions)
    const nextNumber = versions.reduce((max, v) => Math.max(max, v.version), 0) + 1

    const [created] = await scope
      .insert(configVersions, {
        version: nextNumber,
        // §6.5: a running game does not change until the org says so.
        isActive: false,
        sourceFilename: input.sourceFilename,
        sourceHash: hash,
        diffFromPrevious: diff,
        contentSnapshot: snapshot,
        importReport: { issues: input.issues, repairs: input.config.repairs },
        note: input.note ?? null,
        createdBy: input.author,
      })
      .returning()

    const versionId = created!.id
    await writeEntities(scope, input.config, versionId)

    await scope.insert(auditLog, {
      action: 'konfigurace.import',
      entityKind: 'config_version',
      entityId: versionId,
      summary: `Import konfigurace ze souboru ${input.sourceFilename}: verze ${nextNumber}, ${diff.counts.added} přibylo, ${diff.counts.changed} změněno, ${diff.counts.removed} zmizelo.`,
      valueAfter: { version: nextNumber, hash, counts: diff.counts },
      author: input.author,
    })

    return { configVersionId: versionId, version: nextNumber, diff, alreadyImported: false }
  })
}

/** Snapshot of the newest stored version, or undefined on a first import. */
async function latestSnapshot(scope: RunScope): Promise<EntitySnapshot[] | undefined> {
  const versions = await scope.select(configVersions)
  if (versions.length === 0) return undefined
  const newest = versions.reduce((best, v) => (v.version > best.version ? v : best), versions[0]!)
  return (newest.contentSnapshot as EntitySnapshot[] | null) ?? undefined
}

/**
 * Makes a version the one the run computes from (§6.5). Deliberately separate
 * from the import: the org sees the diff first and then decides.
 */
export async function activateConfigVersion(
  runId: string,
  configVersionId: string,
  author: string,
): Promise<void> {
  const run = forRun(runId)
  await run.transaction(async (scope) => {
    const versions = await scope.select(configVersions)
    const target = versions.find((v) => v.id === configVersionId)
    if (!target) throw new Error(`Verze konfigurace ${configVersionId} v tomto běhu neexistuje.`)
    const previous = versions.find((v) => v.isActive)

    // The partial unique index allows one active version per run, so the old
    // one has to step down first.
    if (previous) {
      await scope.update(configVersions, eq(configVersions.id, previous.id)).set({ isActive: false })
    }
    await scope.update(configVersions, eq(configVersions.id, configVersionId)).set({ isActive: true })

    await scope.insert(auditLog, {
      action: 'konfigurace.aktivace',
      entityKind: 'config_version',
      entityId: configVersionId,
      summary: `Běh počítá z verze konfigurace ${target.version}${previous ? ` (dřív ${previous.version})` : ''}.`,
      valueBefore: previous ? { version: previous.version } : null,
      valueAfter: { version: target.version },
      author,
    })
  })
}

/** Upserts every entity of the config, stamping it with this version. */
async function writeEntities(
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
): Promise<void> {
  const groupIds = await upsertGroups(scope, config, versionId)
  const characterIds = await upsertCharacters(scope, config, versionId, groupIds)
  const scaleIds = await upsertScales(scope, config, versionId)
  await upsertCharacterScales(scope, config, versionId, characterIds, scaleIds)
  const flagIds = await upsertFlags(scope, config, versionId)
  const chapterIds = await loadChapters(scope)
  const blockIds = await upsertBlocks(scope, config, versionId, characterIds, chapterIds)
  await upsertQuestions(scope, config, versionId, {
    characterIds,
    scaleIds,
    flagIds,
    chapterIds,
    blockIds,
  })
}

/** `onConflictDoUpdate` keyed by the source ID: insert once, update thereafter. */
async function upsertGroups(
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
): Promise<Map<string, string>> {
  for (const group of config.groups) {
    await scope
      .insert(groups, {
        externalId: externalGroupId(group.name),
        name: group.name,
        sourceConfigVersionId: versionId,
      })
      .onConflictDoUpdate({
        target: [groups.runId, groups.externalId],
        set: { name: group.name, sourceConfigVersionId: versionId },
      })
  }
  const rows = await scope.select(groups)
  return new Map(rows.map((row) => [row.name, row.id]))
}

/** Group names are free text in the sheet; the stored ID is derived from them. */
function externalGroupId(name: string): string {
  return `G_${name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')}`
}

async function upsertCharacters(
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
  groupIds: Map<string, string>,
): Promise<Map<string, string>> {
  for (const character of config.characters) {
    await scope
      .insert(characters, {
        externalId: character.externalId,
        firstName: character.firstName,
        lastName: character.lastName,
        homeGroupId: groupIds.get(character.groupName) ?? null,
        templateExternalId: character.templateExternalId || null,
        sourceConfigVersionId: versionId,
      })
      .onConflictDoUpdate({
        target: [characters.runId, characters.externalId],
        set: {
          firstName: character.firstName,
          lastName: character.lastName,
          homeGroupId: groupIds.get(character.groupName) ?? null,
          templateExternalId: character.templateExternalId || null,
          sourceConfigVersionId: versionId,
        },
      })
  }
  const rows = await scope.select(characters)
  return new Map(rows.map((row) => [row.externalId, row.id]))
}

/**
 * Scales are defined per chapter in the sheet but stored once per run: the
 * definition is per run and scale, never per character (§4.1). A later
 * chapter's definition wins, which is what re-importing means.
 */
async function upsertScales(
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
): Promise<Map<string, string>> {
  for (const chapter of config.chapters) {
    for (const scale of config.scales.get(chapter) ?? []) {
      await scope
        .insert(scales, {
          key: scale.key,
          label: scale.label,
          minValue: scale.min,
          maxValue: scale.max,
          scope: scale.scope,
          mergeStrategy: (scale.mergeStrategy ?? null) as never,
          splitStrategy: (scale.splitStrategy ?? null) as never,
          sourceConfigVersionId: versionId,
        })
        .onConflictDoUpdate({
          target: [scales.runId, scales.key],
          set: {
            label: scale.label,
            minValue: scale.min,
            maxValue: scale.max,
            scope: scale.scope,
            mergeStrategy: (scale.mergeStrategy ?? null) as never,
            splitStrategy: (scale.splitStrategy ?? null) as never,
            sourceConfigVersionId: versionId,
          },
        })
    }
  }

  const rows = await scope.select(scales)
  const scaleIds = new Map(rows.map((row) => [row.key, row.id]))

  for (const chapter of config.chapters) {
    for (const scale of config.scales.get(chapter) ?? []) {
      const scaleId = scaleIds.get(scale.key)
      if (!scaleId) continue
      for (const band of scale.bands) {
        await scope
          .insert(scaleBands, {
            scaleId,
            ordinal: band.ordinal,
            minValue: band.min,
            maxValue: band.max,
            name: band.name,
          })
          .onConflictDoUpdate({
            target: [scaleBands.runId, scaleBands.scaleId, scaleBands.ordinal],
            set: { minValue: band.min, maxValue: band.max, name: band.name },
          })
      }
    }
  }

  return scaleIds
}

async function upsertCharacterScales(
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
  characterIds: Map<string, string>,
  scaleIds: Map<string, string>,
): Promise<void> {
  for (const character of config.characters) {
    const characterId = characterIds.get(character.externalId)
    if (!characterId) continue
    for (const [key, entry] of Object.entries(character.initialScales)) {
      const scaleId = scaleIds.get(key)
      if (!scaleId) continue
      await scope
        .insert(characterScales, {
          characterId,
          scaleId,
          externalId: `S_${character.externalId}_${key}`,
          initialValue: entry.value,
          sourceConfigVersionId: versionId,
        })
        .onConflictDoUpdate({
          target: [characterScales.runId, characterScales.characterId, characterScales.scaleId],
          set: { initialValue: entry.value, sourceConfigVersionId: versionId },
        })
    }
  }
}

/** Flags are never declared: they exist by being set by an answer (layer 2). */
async function upsertFlags(
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
): Promise<Map<string, string>> {
  const keys = new Set<string>()
  for (const questions of config.questions.values()) {
    for (const question of questions) {
      for (const option of question.options) {
        for (const flag of option.flags) keys.add(flag)
      }
    }
  }

  for (const key of keys) {
    await scope
      .insert(flags, { key, label: key.replace(/^F_/, '').replace(/_/g, ' '), sourceConfigVersionId: versionId })
      .onConflictDoUpdate({
        target: [flags.runId, flags.key],
        set: { sourceConfigVersionId: versionId },
      })
  }

  const rows = await scope.select(flags)
  return new Map(rows.map((row) => [row.key, row.id]))
}

async function loadChapters(scope: RunScope): Promise<Map<number, string>> {
  const rows = await scope.select(chaptersTable)
  return new Map(rows.map((row) => [row.number, row.id]))
}

async function upsertBlocks(
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
  characterIds: Map<string, string>,
  chapterIds: Map<number, string>,
): Promise<Map<string, string>> {
  for (const [chapter, blocks] of config.blocks) {
    const chapterId = chapterIds.get(chapter)
    if (!chapterId) continue
    for (const block of blocks) {
      const characterId = block.characterId ? characterIds.get(block.characterId) : undefined
      if (!characterId) continue
      await scope
        .insert(contentBlocks, {
          externalId: block.externalId,
          chapterId,
          characterId,
          sourceConfigVersionId: versionId,
        })
        .onConflictDoUpdate({
          target: [contentBlocks.runId, contentBlocks.externalId],
          set: { chapterId, characterId, sourceConfigVersionId: versionId },
        })
    }
  }

  const rows = await scope.select(contentBlocks)
  const blockIds = new Map(rows.map((row) => [row.externalId, row.id]))

  for (const blocks of config.blocks.values()) {
    for (const block of blocks) {
      const blockId = blockIds.get(block.externalId)
      if (!blockId) continue
      for (const variation of block.variations) {
        await scope
          .insert(blockVariations, {
            externalId: variation.externalId,
            blockId,
            priority: variation.priority,
            description: variation.description || null,
            text: variation.text,
            conditionExpr: variation.condition.raw,
            conditionRefs: variation.condition.references,
          })
          .onConflictDoUpdate({
            target: [blockVariations.runId, blockVariations.externalId],
            set: {
              blockId,
              priority: variation.priority,
              description: variation.description || null,
              text: variation.text,
              conditionExpr: variation.condition.raw,
              conditionRefs: variation.condition.references,
            },
          })
      }
    }
  }

  return blockIds
}

interface QuestionRefs {
  characterIds: Map<string, string>
  scaleIds: Map<string, string>
  flagIds: Map<string, string>
  chapterIds: Map<number, string>
  blockIds: Map<string, string>
}

async function upsertQuestions(
  scope: RunScope,
  config: ParsedConfig,
  versionId: string,
  refs: QuestionRefs,
): Promise<void> {
  for (const [chapter, list] of config.questions) {
    const chapterId = refs.chapterIds.get(chapter)
    if (!chapterId) continue

    for (const question of list) {
      const characterId = question.characterId
        ? refs.characterIds.get(question.characterId)
        : undefined
      if (!characterId) continue

      const scaleId =
        question.type === 'scale_direct' && question.scaleKey
          ? (refs.scaleIds.get(question.scaleKey) ?? null)
          : null

      await scope
        .insert(questions, {
          externalId: question.externalId,
          chapterId,
          characterId,
          ordinal: question.ordinal,
          type: question.type,
          source: question.source,
          isPaired: question.isPaired,
          text: question.text,
          scaleId,
          allowOther: question.options.some((o) => o.isOther),
          sourceConfigVersionId: versionId,
        })
        .onConflictDoUpdate({
          target: [questions.runId, questions.externalId],
          set: {
            chapterId,
            characterId,
            ordinal: question.ordinal,
            type: question.type,
            source: question.source,
            isPaired: question.isPaired,
            text: question.text,
            scaleId,
            allowOther: question.options.some((o) => o.isOther),
            sourceConfigVersionId: versionId,
          },
        })
    }
  }

  const questionRows = await scope.select(questions)
  const questionIds = new Map(questionRows.map((row) => [row.externalId, row.id]))

  for (const list of config.questions.values()) {
    for (const question of list) {
      const questionId = questionIds.get(question.externalId)
      if (!questionId) continue
      for (const option of question.options) {
        const referenced = option.referencedCharacter
          ? (refs.characterIds.get(option.referencedCharacter) ?? null)
          : null
        await scope
          .insert(answerOptions, {
            externalId: option.externalId,
            questionId,
            ordinal: option.ordinal,
            label: option.label,
            referencedCharacterId: referenced,
            isOther: option.isOther,
          })
          .onConflictDoUpdate({
            target: [answerOptions.runId, answerOptions.externalId],
            set: {
              questionId,
              ordinal: option.ordinal,
              label: option.label,
              referencedCharacterId: referenced,
              isOther: option.isOther,
            },
          })
      }
    }
  }

  const optionRows = await scope.select(answerOptions)
  const optionIds = new Map(optionRows.map((row) => [row.externalId, row.id]))

  await writeAnswerEffects(scope, config, refs, optionIds, versionId)
}

/**
 * Layers 1 and 2 (§4.5) end up in the same `effects` table as rules do, owned
 * by the answer option — so adding them is not a new branch in the engine.
 *
 * Effects have no source ID of their own, so an answer's effects are rewritten
 * as a set: they are derived data, fully reproducible from the sheet.
 */
async function writeAnswerEffects(
  scope: RunScope,
  config: ParsedConfig,
  refs: QuestionRefs,
  optionIds: Map<string, string>,
  versionId: string,
): Promise<void> {
  for (const list of config.questions.values()) {
    for (const question of list) {
      for (const option of question.options) {
        const optionId = optionIds.get(option.externalId)
        if (!optionId) continue

        let ordinal = 0
        const rows: (typeof effects.$inferInsert)[] = []
        const add = (row: Omit<typeof effects.$inferInsert, 'runId' | 'externalId' | 'sourceConfigVersionId' | 'ordinal' | 'answerOptionId'>) => {
          rows.push({
            runId: scope.runId,
            answerOptionId: optionId,
            externalId: `${option.externalId}#${ordinal}`,
            sourceConfigVersionId: versionId,
            ordinal: ordinal++,
            ...row,
          })
        }

        for (const impact of option.impacts) {
          const scaleId = refs.scaleIds.get(impact.scale)
          if (!scaleId) continue
          add({
            kind: impact.mode === 'absolutni' ? 'nastaveni_skaly' : 'zmena_skaly',
            characterId: refs.characterIds.get(impact.character) ?? null,
            scaleId,
            scaleDelta: impact.mode === 'posun' ? (impact.delta ?? 0) : null,
            // `=VALUE` takes the number from the answer, so nothing is stored here.
            scaleSetValue: impact.mode === 'absolutni' ? (impact.value ?? null) : null,
          })
        }

        for (const blockId of option.blocks) {
          add({ kind: 'blok', blockExternalId: blockId })
        }

        for (const flag of option.flags) {
          const flagId = refs.flagIds.get(flag)
          if (!flagId) continue
          add({ kind: 'priznak', flagId, flagValue: true })
        }

        for (const effect of option.effects) {
          const mapped = mapStructuralEffect(effect.name)
          if (!mapped) continue
          // §7.3: the partner comes from whoever the chosen option names, so
          // the author does not write a rule per pair of 23 characters.
          add({ kind: mapped, relatedFromAnswer: true })
        }

        for (const row of rows) {
          await scope.insert(effects, row).onConflictDoUpdate({
            target: [effects.runId, effects.externalId],
            set: { ...row, runId: undefined, externalId: undefined } as never,
          })
        }
      }
    }
  }
}

function mapStructuralEffect(name: string): 'domacnost_slouceni' | 'domacnost_rozdeleni' | 'vedeni' | 'clenstvi' | undefined {
  switch (name) {
    case 'SNATEK':
      return 'domacnost_slouceni'
    case 'ROZVOD':
      return 'domacnost_rozdeleni'
    case 'VEDENI':
      return 'vedeni'
    case 'CLENSTVI':
      return 'clenstvi'
    default:
      return undefined
  }
}
