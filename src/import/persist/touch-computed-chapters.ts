import { inArray } from 'drizzle-orm'
import type { RunScope } from '@/db'
import { chapters, computations } from '@/db/schema'

/**
 * An emergency config fix marks every computed chapter as touched — the same
 * cascade as fixing an answer (§3.2, §6.5). Nothing is recomputed; the org decides.
 */
export const touchComputedChapters = async (scope: RunScope, reason: string): Promise<number[]> => {
  const chapterIds = new Set<string>()
  for (const row of await scope.selectColumns(computations, { chapterId: computations.chapterId })) {
    chapterIds.add(row.chapterId)
  }
  if (chapterIds.size === 0) return []

  const computed = inArray(chapters.id, [...chapterIds])

  await scope.update(chapters, computed).set({
    isTouched: true,
    touchedAt: new Date(),
    touchedReason: reason,
    // A new touch asks for a new decision.
    cascadeDecision: null,
    cascadeDecidedAt: null,
    cascadeDecidedBy: null,
  })

  const touched = await scope.select(chapters, computed)

  return touched.map((chapter) => chapter.number).sort((a, b) => a - b)
}
