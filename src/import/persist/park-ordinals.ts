import { sql } from 'drizzle-orm'
import type { RunScope } from '@/db'
import { answerOptions, blockVariations, questions } from '@/db/schema'
import { ORDINAL_PARKING_OFFSET } from '../constants/ordinal-parking'

/**
 * A re-uploaded sheet may reorder questions, options or variants. Upserts go by
 * source ID, so a moved row would hit the old holder of its position on the
 * `(parent, ordinal)` unique before stale rows are gone. Existing positions are
 * parked out of range first; every upsert then writes its own, and whatever
 * stays parked is stale and removed in the same transaction.
 */
export const parkOrdinals = async (scope: RunScope): Promise<void> => {
  await scope.update(questions).set({ ordinal: sql`${questions.ordinal} + ${ORDINAL_PARKING_OFFSET}` })
  await scope.update(answerOptions).set({ ordinal: sql`${answerOptions.ordinal} + ${ORDINAL_PARKING_OFFSET}` })
  await scope.update(blockVariations).set({ priority: sql`${blockVariations.priority} + ${ORDINAL_PARKING_OFFSET}` })
}
