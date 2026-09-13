import { fail } from '../errors/engineInputError'
import type { ScaleKey } from '../types/ids'
import type { ScaleDefinition } from '../types/scale'
import type { Catalog } from './buildCatalog'

export const scaleOf = (catalog: Catalog, scaleKey: ScaleKey): ScaleDefinition =>
  catalog.scales.get(scaleKey) ?? fail('neznamy_odkaz', scaleKey, 'unknown scale')

/** Sorted keys of the scales a household owns. */
export const householdScaleKeys = (catalog: Catalog): ScaleKey[] =>
  [...catalog.scales.values()]
    .filter((scale) => scale.scope === 'domacnost')
    .map((scale) => scale.key)
    .sort()
