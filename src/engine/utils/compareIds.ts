/**
 * Code-unit order, not `localeCompare`: the output must be identical on every
 * machine, whatever its locale.
 */
export const compareIds = (a: string, b: string): number => {
  if (a < b) return -1
  if (a > b) return 1

  return 0
}
