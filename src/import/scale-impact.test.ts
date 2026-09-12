import { describe, expect, it } from 'vitest'
import {
  accountCounterpart,
  parseScaleImpact,
  splitScaleId,
} from './scale-impact'

describe('parseScaleImpact', () => {
  it('empty cell means no impact', () => {
    expect(parseScaleImpact('')).toEqual({ impacts: [], problems: [] })
    expect(parseScaleImpact(undefined)).toEqual({ impacts: [], problems: [] })
    expect(parseScaleImpact('   ')).toEqual({ impacts: [], problems: [] })
  })

  it('reads a single shift', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Wealth_osobni+3')
    expect(problems).toEqual([])
    expect(impacts).toEqual([
      {
        externalId: 'S_Marie_Wealth_osobni',
        character: 'Marie',
        scale: 'Wealth_osobni',
        mode: 'posun',
        delta: 3,
        raw: 'S_Marie_Wealth_osobni+3',
      },
    ])
  })

  it('reads a negative shift', () => {
    const { impacts } = parseScaleImpact('S_Marie_Regime-2')
    expect(impacts[0]!).toMatchObject({ scale: 'Regime', delta: -2, mode: 'posun' })
  })

  it('reads the list from the spec, separated by commas', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Wealth_osobni+3, S_Marie_Regime-2')
    expect(problems).toEqual([])
    expect(impacts.map((i) => [i.externalId, i.delta])).toEqual([
      ['S_Marie_Wealth_osobni', 3],
      ['S_Marie_Regime', -2],
    ])
  })

  it('accepts semicolons too, as the real sheet uses them', () => {
    const { impacts, problems } = parseScaleImpact('S_Karel_Regime+2;S_Karel_Control+1')
    expect(problems).toEqual([])
    expect(impacts).toHaveLength(2)
  })

  it('keeps +0 as a real impact rather than dropping it', () => {
    const { impacts } = parseScaleImpact('S_Marie_Control+0')
    expect(impacts[0]!).toMatchObject({ delta: 0, mode: 'posun' })
  })

  it('keeps the underscore inside a scale name', () => {
    const { impacts } = parseScaleImpact('S_Marie_Wealth_spolecny+1')
    expect(impacts[0]!).toMatchObject({ character: 'Marie', scale: 'Wealth_spolecny' })
  })

  it('reads =VALUE as an absolute set fed by the answer', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Wealth_osobni=VALUE')
    expect(problems).toEqual([])
    expect(impacts[0]!).toMatchObject({ mode: 'absolutni', fromAnswer: true })
    expect(impacts[0]!.delta).toBeUndefined()
  })

  it('reads a literal absolute value', () => {
    const { impacts } = parseScaleImpact('S_Marie_Wealth_osobni=7')
    expect(impacts[0]!).toMatchObject({ mode: 'absolutni', value: 7 })
  })

  it('tolerates spaces around the sign and the separator', () => {
    const { impacts, problems } = parseScaleImpact('  S_Marie_Regime + 2 ,  S_Marie_Control - 1 ')
    expect(problems).toEqual([])
    expect(impacts.map((i) => i.delta)).toEqual([2, -1])
  })

  it('reports a missing sign instead of silently ignoring it', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Wealth_osobni3')
    expect(impacts).toEqual([])
    expect(problems[0]!.reason).toBe('chybi_znamenko')
  })

  it('reports a missing S_ prefix', () => {
    const { problems } = parseScaleImpact('Marie_Wealth+3')
    expect(problems[0]!.reason).toBe('chybi_prefix')
  })

  it('reports a non-numeric magnitude', () => {
    const { problems } = parseScaleImpact('S_Marie_Wealth_osobni+hodne')
    expect(problems[0]!.reason).toBe('necislo')
  })

  it('collects every problem in a cell, not just the first', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Wealth3, S_Marie_Regime-2, Control+1')
    expect(problems).toHaveLength(2)
    expect(impacts).toHaveLength(1)
  })

  it('a decimal is not a valid shift — scales are integers', () => {
    const { problems } = parseScaleImpact('S_Marie_Wealth_osobni+1.5')
    expect(problems[0]!.reason).toBe('necislo')
  })

  it('survives diacritics in the character part', () => {
    const { impacts } = parseScaleImpact('S_Věra_Regime+3')
    expect(impacts[0]!).toMatchObject({ character: 'Věra', scale: 'Regime', delta: 3 })
  })
})

describe('splitScaleId', () => {
  it('splits a full scale ID', () => {
    expect(splitScaleId('S_Marie_Wealth_osobni')).toEqual({
      character: 'Marie',
      scale: 'Wealth_osobni',
    })
  })

  it('returns undefined for something that is not a scale ID', () => {
    expect(splitScaleId('A_Marie_1_1_Karel')).toBeUndefined()
    expect(splitScaleId('S_Marie')).toBeUndefined()
  })
})

describe('accountCounterpart', () => {
  it('pairs the two accounts both ways', () => {
    expect(accountCounterpart('Wealth_osobni')).toBe('Wealth_spolecny')
    expect(accountCounterpart('Wealth_spolecny')).toBe('Wealth_osobni')
  })

  it('an ordinary scale has no counterpart', () => {
    expect(accountCounterpart('Regime')).toBeUndefined()
  })
})
