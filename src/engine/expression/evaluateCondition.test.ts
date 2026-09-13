import { describe, expect, it } from 'vitest'
import { loadFixtureConfig } from '@/testing/fixture-run'
import { buildCatalog } from '../catalog/buildCatalog'
import { EngineInputError } from '../errors/engineInputError'
import type { CompiledCondition } from '../types/condition'
import { compileCondition } from './compileCondition'
import { evaluateCondition, type ConditionEnvironment } from './evaluateCondition'

const catalog = buildCatalog(loadFixtureConfig())

const compile = (expression: string, chapter: 1 | 2 = 2): CompiledCondition =>
  compileCondition(expression, { catalog, chapter, ownerId: 'V_test' })

const environment = (overrides: Partial<ConditionEnvironment> = {}): ConditionEnvironment => ({
  isChosen: (optionId) => optionId === 'A_Marie_2_1_Mirek',
  hasFlag: (flagId) => flagId === 'F_Vedouci',
  scaleValue: (_characterId, scaleKey) => (scaleKey === 'Wealth_spolecny' ? 8 : undefined),
  roll: () => undefined,
  ...overrides,
})

const problemCode = (run: () => unknown): string | undefined => {
  try {
    run()
  } catch (error) {
    return error instanceof EngineInputError ? error.problems[0]?.code : undefined
  }

  return undefined
}

describe('compileCondition', () => {
  it('reads the author’s `=` as equality', () => {
    expect(compile('S_Marie_Regime = 6')).toMatchObject({ kind: 'compare', operator: '==' })
  })

  it('binds AND tighter than OR', () => {
    expect(compile('F_Vedouci OR F_Svatba AND F_Duchod')).toMatchObject({ kind: 'or', right: { kind: 'and' } })
  })

  it('rejects unknown identifiers instead of reading them as false', () => {
    expect(problemCode(() => compile('A_Marie_9_9_Nikdo'))).toBe('neznamy_identifikator')
    expect(problemCode(() => compile('F_Neexistuje'))).toBe('neznamy_identifikator')
    expect(problemCode(() => compile('S_Marie_Welth_osobni >= 3'))).toBe('neznamy_identifikator')
  })

  it('rejects an answer from a later chapter', () => {
    expect(problemCode(() => compile('A_Marie_2_1_Mirek', 1))).toBe('neznamy_identifikator')
  })

  it('rejects a scale used as a truth value and DEFAULT inside an expression', () => {
    expect(problemCode(() => compile('S_Marie_Regime'))).toBe('neplatny_vyraz')
    expect(problemCode(() => compile('F_Vedouci OR DEFAULT'))).toBe('neplatny_vyraz')
    expect(problemCode(() => compile('F_Vedouci && F_Svatba'))).toBe('neplatny_vyraz')
  })
})

describe('evaluateCondition', () => {
  it('holds and records what it read', () => {
    const outcome = evaluateCondition(compile('A_Marie_2_1_Mirek AND S_Marie_Wealth_spolecny >= 7'), environment())

    expect(outcome).toEqual({
      result: 'plati',
      readings: [
        { reference: 'A_Marie_2_1_Mirek', value: true },
        { reference: 'S_Marie_Wealth_spolecny', value: 8 },
      ],
      needsRoll: false,
    })
  })

  it('does not ask for a roll when the other side already decides', () => {
    const outcome = evaluateCondition(compile('!A_Marie_2_1_Mirek AND RANDOM(50)'), environment())

    expect(outcome).toMatchObject({ result: 'neplati', needsRoll: false })
  })

  it('asks for a roll only when the result depends on it', () => {
    const unmarried = environment({ isChosen: () => false })

    expect(evaluateCondition(compile('!A_Marie_2_1_Mirek AND RANDOM(50)'), unmarried)).toMatchObject({ result: 'neznamo', needsRoll: true })
    expect(evaluateCondition(compile('RANDOM(50) OR F_Vedouci'), unmarried)).toMatchObject({ result: 'plati', needsRoll: false })
  })

  it('reads RANDOM(p) as roll ≤ p', () => {
    expect(evaluateCondition(compile('RANDOM(50)'), environment({ roll: () => 50 })).result).toBe('plati')
    expect(evaluateCondition(compile('RANDOM(50)'), environment({ roll: () => 51 })).result).toBe('neplati')
  })

  it('keeps an open value unknown through negation', () => {
    expect(evaluateCondition(compile('!(S_Marie_Wealth_osobni <= 3)'), environment()).result).toBe('neznamo')
  })
})
