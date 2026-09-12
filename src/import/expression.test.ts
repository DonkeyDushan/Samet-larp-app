import { describe, expect, it } from 'vitest'
import { parseCondition } from './expression'

describe('parseCondition', () => {
  it('DEFAULT is the always-true variant, not an expression', () => {
    const result = parseCondition('DEFAULT')
    expect(result.isDefault).toBe(true)
    expect(result.ok).toBe(true)
    expect(result.references).toEqual([])
  })

  it('reads a bare answer reference', () => {
    const result = parseCondition('A_Marie_1_1_Karel')
    expect(result.ok).toBe(true)
    expect(result.references).toEqual([{ name: 'A_Marie_1_1_Karel', kind: 'odpoved' }])
  })

  it('reads negation', () => {
    const result = parseCondition('!A_Marie_2_1_Mirek')
    expect(result.ok).toBe(true)
    expect(result.references).toEqual([{ name: 'A_Marie_2_1_Mirek', kind: 'odpoved' }])
  })

  it('reads AND with a scale comparison', () => {
    const result = parseCondition('A_Marie_2_1_Mirek AND S_Marie_Wealth_spolecny >= 7')
    expect(result.ok).toBe(true)
    expect(result.references).toEqual([
      { name: 'A_Marie_2_1_Mirek', kind: 'odpoved' },
      { name: 'S_Marie_Wealth_spolecny', kind: 'skala' },
    ])
  })

  it('classifies a flag reference', () => {
    const result = parseCondition('A_Marie_2_4_Ano AND F_Vedouci')
    expect(result.references.map((r) => r.kind)).toEqual(['odpoved', 'priznak'])
  })

  it('accepts the single = the author writes', () => {
    const result = parseCondition('S_Marie_Regime = 5')
    expect(result.ok).toBe(true)
    expect(result.references).toEqual([{ name: 'S_Marie_Regime', kind: 'skala' }])
  })

  it('leaves <=, >= and != alone while rewriting =', () => {
    for (const expr of ['S_M_A <= 3', 'S_M_A >= 3', 'S_M_A != 3', 'S_M_A == 3']) {
      expect(parseCondition(expr).ok).toBe(true)
    }
  })

  it('reads RANDOM and flags that a roll is needed', () => {
    const result = parseCondition('!A_Marie_2_1_Mirek AND RANDOM(50)')
    expect(result.ok).toBe(true)
    expect(result.usesRandom).toBe(true)
  })

  it('handles nested parentheses with OR', () => {
    const result = parseCondition(
      'A_Marie_1_1_Karel AND !(A_Marie_2_3_Postava2 OR A_Marie_2_3_Postava3)',
    )
    expect(result.ok).toBe(true)
    expect(result.references).toHaveLength(3)
  })

  it('catches the missing closing bracket from the sample sheet', () => {
    const result = parseCondition(
      '!A_Marie_2_1_Mirek AND !(S_Marie_Wealth_osobni <= 3 OR F_Svatba',
    )
    expect(result.ok).toBe(false)
    expect(result.error).toContain('uzavírací závorka')
  })

  it('catches a surplus closing bracket', () => {
    const result = parseCondition('A_x AND B_y)')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('závorka')
  })

  it('catches a missing connector', () => {
    const result = parseCondition('A_Marie_1_1_Karel A_Marie_1_1_Vera')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('spojky')
  })

  it('rejects an unknown function', () => {
    const result = parseCondition('NAHODA(50)')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('RANDOM')
  })

  it('rejects RANDOM outside 0-100', () => {
    expect(parseCondition('RANDOM(150)').ok).toBe(false)
  })

  it('rejects DEFAULT used inside a larger expression', () => {
    const result = parseCondition('A_x OR DEFAULT')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('DEFAULT')
  })

  it('an empty condition is an error, never a silent always-true', () => {
    const result = parseCondition('')
    expect(result.ok).toBe(false)
    expect(result.isDefault).toBe(false)
  })

  it('deduplicates repeated references', () => {
    const result = parseCondition('A_x OR (A_x AND F_y)')
    expect(result.references).toHaveLength(2)
  })

  it('survives diacritics in identifiers', () => {
    const result = parseCondition('A_Věra_2_1_Ano AND F_Ve_straně')
    expect(result.ok).toBe(true)
    expect(result.references.map((r) => r.name)).toEqual(['A_Věra_2_1_Ano', 'F_Ve_straně'])
  })
})
