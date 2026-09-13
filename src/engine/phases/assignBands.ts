/** Phase 5: bands are derived from the final values; thresholds and names come from data (§4.1). */
import { scaleOf } from '../catalog/scaleOf'
import type { EvaluationContext } from '../evaluationContext'
import type { ScaleKey } from '../types/ids'
import type { ScaleDefinition } from '../types/scale'
import type { ScaleOwner } from '../types/source'
import type { BandRef } from '../types/trace'
import { compareIds } from '../utils/compareIds'
import { findBand } from '../utils/scaleMath'

const bandRef = (scale: ScaleDefinition, ordinal: number | undefined): BandRef | null => {
  const band = scale.bands.find((candidate) => candidate.ordinal === ordinal)

  return band ? { ordinal: band.ordinal, name: band.name } : null
}

const bandsFor = (
  context: EvaluationContext,
  owner: ScaleOwner,
  scales: Record<ScaleKey, number>,
  previous: Record<ScaleKey, number>,
): Record<ScaleKey, number> => {
  const bands: Record<ScaleKey, number> = {}

  for (const [scaleKey, value] of Object.entries(scales).sort(([a], [b]) => compareIds(a, b))) {
    const scale = scaleOf(context.catalog, scaleKey)
    const band = findBand(scale, value)
    if (band) bands[scaleKey] = band.ordinal

    const before = bandRef(scale, previous[scaleKey])
    const after = band ? { ordinal: band.ordinal, name: band.name } : null
    if (before?.ordinal !== after?.ordinal) {
      context.trace.push({ phase: 'pasma', kind: 'pasmo', owner, scaleKey, value, before, after })
    }
  }

  return bands
}

export const assignBands = (context: EvaluationContext): void => {
  for (const characterId of context.catalog.characterIds) {
    const character = context.state.characters[characterId]
    if (!character) continue

    const previous = context.start.characters[characterId]?.bands ?? {}
    character.bands = bandsFor(context, { kind: 'postava', characterId }, character.scales, previous)
  }

  for (const [householdId, household] of Object.entries(context.state.households).sort(([a], [b]) => compareIds(a, b))) {
    const previous = context.start.households[householdId]?.bands ?? {}
    const owner: ScaleOwner = { kind: 'domacnost', householdId, memberIds: [...household.memberIds] }
    household.bands = bandsFor(context, owner, household.scales, previous)
  }
}
