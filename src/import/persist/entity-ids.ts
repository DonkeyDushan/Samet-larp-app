/** Source ID → database ID lookups built while writing a config. */
export type IdMap<K extends string | number = string> = Map<K, string>

export interface EntityIds {
  characterIds: IdMap
  scaleIds: IdMap
  flagIds: IdMap
  chapterIds: IdMap<number>
  blockIds: IdMap
}
