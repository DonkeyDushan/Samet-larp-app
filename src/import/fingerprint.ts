/**
 * Content fingerprint of an import (§10.2).
 *
 * Uploading the same file twice must not duplicate anything, so a version is
 * identified by what it contains rather than by the filename or the upload
 * time: the author often re-downloads the sheet without changing it.
 *
 * The hash covers the parsed content, not the raw bytes — Google Sheets rewrites
 * the file on every download, so two byte-different exports of an unchanged
 * sheet have to come out equal.
 */
import { createHash } from 'node:crypto'
import type { ParsedConfig } from './types/parsed-config'

export const fingerprintConfig = (config: ParsedConfig): string => {
  const hash = createHash('sha256')
  hash.update(JSON.stringify(stableShape(config)))

  return hash.digest('hex')
}

/** Sorted, so map iteration order cannot change the fingerprint. */
const stableShape = (config: ParsedConfig) => {
  return {
    characters: config.characters
      .map((c) => ({
        id: c.externalId,
        first: c.firstName,
        last: c.lastName,
        group: c.groupName,
        template: c.templateExternalId,
        scales: Object.entries(c.initialScales)
          .map(([key, entry]) => [key, entry.value] as const)
          .sort(([a], [b]) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    scales: [...config.scales.entries()]
      .sort(([a], [b]) => a - b)
      .map(([chapter, scales]) => [
        chapter,
        scales
          .map((s) => ({
            key: s.key,
            label: s.label,
            scope: s.scope,
            min: s.min,
            max: s.max,
            merge: s.mergeStrategy ?? null,
            split: s.splitStrategy ?? null,
            bands: s.bands.map((b) => [b.ordinal, b.min, b.max, b.name]),
          }))
          .sort((a, b) => a.key.localeCompare(b.key)),
      ]),
    questions: [...config.questions.entries()]
      .sort(([a], [b]) => a - b)
      .map(([chapter, questions]) => [
        chapter,
        questions
          .map((q) => ({
            id: q.externalId,
            character: q.characterId ?? q.characterRef,
            text: q.text,
            type: q.type,
            source: q.source,
            paired: q.isPaired,
            ordinal: q.ordinal,
            options: q.options.map((o) => ({
              id: o.externalId,
              label: o.label,
              ordinal: o.ordinal,
              impacts: o.impacts.map((i) => i.raw),
              blocks: o.blocks,
              flags: o.flags,
              effects: o.effects.map((e) => e.raw),
            })),
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      ]),
    blocks: [...config.blocks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([chapter, blocks]) => [
        chapter,
        blocks
          .map((b) => ({
            id: b.externalId,
            character: b.characterId ?? b.characterRef,
            variations: b.variations
              .map((v) => ({
                id: v.externalId,
                priority: v.priority,
                text: v.text,
                condition: v.condition.raw,
              }))
              .sort((a, b2) => a.id.localeCompare(b2.id)),
          }))
          .sort((a, b2) => a.id.localeCompare(b2.id)),
      ]),
  }
}
