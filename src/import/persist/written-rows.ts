/** Database IDs the import wrote, per table; any other config row is stale. */
export interface WrittenRows {
  groups: Set<string>
  characters: Set<string>
  scales: Set<string>
  scaleBands: Set<string>
  characterScales: Set<string>
  flags: Set<string>
  contentBlocks: Set<string>
  blockVariations: Set<string>
  questions: Set<string>
  answerOptions: Set<string>
  effects: Set<string>
}

export const createWrittenRows = (): WrittenRows => ({
  groups: new Set(),
  characters: new Set(),
  scales: new Set(),
  scaleBands: new Set(),
  characterScales: new Set(),
  flags: new Set(),
  contentBlocks: new Set(),
  blockVariations: new Set(),
  questions: new Set(),
  answerOptions: new Set(),
  effects: new Set(),
})
