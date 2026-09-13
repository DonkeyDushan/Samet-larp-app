/**
 * Runs the engine on `documents/fixture-platny.xlsx` for chapters 1 and 2 and
 * prints everything chapter 2 says about one character: state, household,
 * chosen variations and trace.
 *
 *   npx tsx scripts/engine-demo.ts [characterId]
 */
import { runFixture } from '../src/testing/fixture-run'

/** Indentation of the printed JSON. */
const JSON_INDENT = 2

const characterId = process.argv[2] ?? 'Marie'
const { chapter2 } = runFixture()

const character = chapter2.state.characters[characterId]
if (!character) throw new Error(`No character ${characterId} in the fixture.`)

// Crude but sufficient for a demo: an entry concerns the character if it names their ID anywhere.
const mentions = (value: unknown): boolean => JSON.stringify(value).includes(`"${characterId}"`)

const output = {
  state: character,
  household: chapter2.state.households[character.householdId],
  variants: chapter2.variants.filter((variant) => variant.characterId === characterId),
  conflicts: chapter2.conflicts.filter(mentions),
  missingRolls: chapter2.missingRolls.filter((request) => request.characterId === characterId),
  trace: chapter2.trace.filter(mentions),
}

console.log(JSON.stringify(output, null, JSON_INDENT))
