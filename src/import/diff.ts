/**
 * Diff between two config versions (§10.2).
 *
 * Re-importing makes a new version and never overwrites the old one, so the
 * author has to see what the import would change before confirming it: what
 * appeared, what vanished, what has a different value.
 *
 * Works on two `ParsedConfig`s rather than on the database, so a diff can be
 * shown before anything is written.
 */
import type { ParsedConfig } from './types'

export type EntityKind =
  | 'postava'
  | 'skupina'
  | 'skala'
  | 'pasmo'
  | 'otazka'
  | 'odpoved'
  | 'blok'
  | 'varianta'

export interface DiffEntry {
  kind: EntityKind
  /** Identifier as the author knows it, e.g. `Q_Marie_2_1`. */
  id: string
  /** Chapter the entity belongs to; absent for run-wide ones. */
  chapter?: number
  /** Field-level changes, only for `zmeneno`. */
  changes?: { field: string; before: string; after: string }[]
}

export interface ConfigDiff {
  added: DiffEntry[]
  removed: DiffEntry[]
  changed: DiffEntry[]
  /** True when nothing differs — a re-upload of the same file (§10.2). */
  identical: boolean
  counts: { added: number; removed: number; changed: number }
}

/**
 * One comparable entity: identity plus the fields worth reporting.
 *
 * Plain JSON on purpose — the snapshot is stored with the config version so the
 * next import has something to diff against without re-parsing an old upload.
 */
export interface EntitySnapshot {
  kind: EntityKind
  id: string
  chapter?: number
  fields: Record<string, string>
}

/** Serializable snapshot of a config, stored on the version row. */
export function configSnapshot(config: ParsedConfig): EntitySnapshot[] {
  return [...snapshot(config).values()]
}

const keyOf = (entity: EntitySnapshot) => `${entity.kind}:${entity.chapter ?? '-'}:${entity.id}`

/** Diffs two stored snapshots — what the admin screen actually compares. */
export function diffSnapshots(
  previous: EntitySnapshot[] | undefined,
  next: EntitySnapshot[],
): ConfigDiff {
  const before = new Map((previous ?? []).map((e) => [keyOf(e), e]))
  const after = new Map(next.map((e) => [keyOf(e), e]))
  return compare(before, after)
}

export function diffConfigs(previous: ParsedConfig | undefined, next: ParsedConfig): ConfigDiff {
  const before = previous ? snapshot(previous) : new Map<string, EntitySnapshot>()
  const after = snapshot(next)
  return compare(before, after)
}

function compare(
  before: Map<string, EntitySnapshot>,
  after: Map<string, EntitySnapshot>,
): ConfigDiff {

  const added: DiffEntry[] = []
  const removed: DiffEntry[] = []
  const changed: DiffEntry[] = []

  for (const [key, entity] of after) {
    const old = before.get(key)
    if (!old) {
      added.push({ kind: entity.kind, id: entity.id, chapter: entity.chapter })
      continue
    }
    const changes = fieldChanges(old.fields, entity.fields)
    if (changes.length > 0) {
      changed.push({ kind: entity.kind, id: entity.id, chapter: entity.chapter, changes })
    }
  }

  for (const [key, entity] of before) {
    if (!after.has(key)) {
      removed.push({ kind: entity.kind, id: entity.id, chapter: entity.chapter })
    }
  }

  return {
    added,
    removed,
    changed,
    identical: added.length === 0 && removed.length === 0 && changed.length === 0,
    counts: { added: added.length, removed: removed.length, changed: changed.length },
  }
}

function fieldChanges(
  before: Record<string, string>,
  after: Record<string, string>,
): { field: string; before: string; after: string }[] {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)])
  const changes: { field: string; before: string; after: string }[] = []
  for (const field of fields) {
    const from = before[field] ?? ''
    const to = after[field] ?? ''
    if (from !== to) changes.push({ field, before: from, after: to })
  }
  return changes
}

function snapshot(config: ParsedConfig): Map<string, EntitySnapshot> {
  const entities = new Map<string, EntitySnapshot>()
  const put = (entity: EntitySnapshot) => {
    entities.set(keyOf(entity), entity)
  }

  for (const character of config.characters) {
    put({
      kind: 'postava',
      id: character.externalId,
      fields: {
        jmeno: character.firstName,
        prijmeni: character.lastName,
        skupina: character.groupName,
        sablona: character.templateExternalId,
        pocatecni_hodnoty: Object.entries(character.initialScales)
          .map(([key, entry]) => `${key}=${entry.value}`)
          .sort()
          .join(', '),
      },
    })
  }

  for (const group of config.groups) {
    put({ kind: 'skupina', id: group.name, fields: { nazev: group.name } })
  }

  for (const [chapter, scales] of config.scales) {
    for (const scale of scales) {
      put({
        kind: 'skala',
        id: scale.key,
        chapter,
        fields: {
          nazev: scale.label,
          rozsah: scale.scope,
          meze: `${scale.min}-${scale.max}`,
          slouceni: scale.mergeStrategy ?? '',
          rozdeleni: scale.splitStrategy ?? '',
          pasma: scale.bands.map((b) => `${b.min}-${b.max} ${b.name}`).join('; '),
        },
      })
    }
  }

  for (const [chapter, questions] of config.questions) {
    for (const question of questions) {
      put({
        kind: 'otazka',
        id: question.externalId,
        chapter,
        fields: {
          postava: question.characterId ?? question.characterRef,
          text: question.text,
          typ: question.type,
          zdroj: question.source,
          parova: question.isPaired ? 'ano' : 'ne',
          poradi: String(question.ordinal),
        },
      })

      for (const option of question.options) {
        put({
          kind: 'odpoved',
          id: option.externalId,
          chapter,
          fields: {
            otazka: question.externalId,
            text: option.label,
            dopad: option.impacts.map((i) => i.raw).join(', '),
            bloky: option.blocks.join(', '),
            priznaky: option.flags.join(', '),
            efekty: option.effects.map((e) => e.raw).join(', '),
          },
        })
      }
    }
  }

  for (const [chapter, blocks] of config.blocks) {
    for (const block of blocks) {
      put({
        kind: 'blok',
        id: block.externalId,
        chapter,
        fields: { postava: block.characterId ?? block.characterRef },
      })

      for (const variation of block.variations) {
        put({
          kind: 'varianta',
          id: variation.externalId,
          chapter,
          fields: {
            blok: block.externalId,
            priorita: String(variation.priority),
            podminka: variation.condition.raw,
            text: variation.text,
          },
        })
      }
    }
  }

  return entities
}

/** Czech label for the UI; the diff itself stays language-neutral. */
export const ENTITY_LABELS: Record<EntityKind, string> = {
  postava: 'postava',
  skupina: 'skupina',
  skala: 'škála',
  pasmo: 'pásmo',
  otazka: 'otázka',
  odpoved: 'odpověď',
  blok: 'blok',
  varianta: 'varianta',
}
