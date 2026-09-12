/** Every `S_<Postava>_<Skala>` the config can name, for lookups and suggestions. */
export const knownScaleIds = (characterIds: Iterable<string>, scaleKeys: Iterable<string>): string[] => {
  const ids: string[] = []
  const keys = [...scaleKeys]
  for (const character of characterIds) {
    for (const key of keys) ids.push(`S_${character}_${key}`)
  }

  return ids
}
