/**
 * "Did you mean …?" for mistyped identifiers. A wrong guess costs nothing, a
 * missing one costs the author a hunt through the sheet.
 */
import { CHARS_PER_SUGGESTION_EDIT, MIN_SUGGESTION_DISTANCE } from '../constants/suggestions'

/** Levenshtein distance. */
export const editDistance = (a: string, b: string): number => {
  const cols = b.length + 1
  let prev = Array.from({ length: cols }, (_, j) => j)

  for (let i = 1; i <= a.length; i++) {
    const curr = new Array<number>(cols).fill(0)
    curr[0] = i
    for (let j = 1; j < cols; j++) {
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = curr
  }

  return prev[cols - 1] ?? 0
}

/** Closest known identifier, or undefined when nothing is near enough. */
export const suggestClosest = (value: string, known: Iterable<string>): string | undefined => {
  const limit = Math.max(MIN_SUGGESTION_DISTANCE, Math.floor(value.length / CHARS_PER_SUGGESTION_EDIT))
  let best: string | undefined
  let bestDistance = Infinity

  for (const candidate of known) {
    const distance = editDistance(value.toLowerCase(), candidate.toLowerCase())
    if (distance < bestDistance && distance <= limit) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
}
