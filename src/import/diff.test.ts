import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { diffConfigs } from './diff'
import { importXlsx, importWorkbook } from './import-config'
import { readWorkbook } from './workbook'

const validConfig = () => importXlsx(readFileSync('documents/fixture-platny.xlsx')).config
const brokenConfig = () => importXlsx(readFileSync('documents/fixture-vadny.xlsx')).config

describe('diffConfigs', () => {
  it('the same file twice is identical — a re-upload must not look like a change', () => {
    const diff = diffConfigs(validConfig(), validConfig())
    expect(diff.identical).toBe(true)
    expect(diff.counts).toEqual({ added: 0, removed: 0, changed: 0 })
  })

  it('the first import reports everything as added', () => {
    const diff = diffConfigs(undefined, validConfig())
    expect(diff.removed).toEqual([])
    expect(diff.changed).toEqual([])
    expect(diff.counts.added).toBeGreaterThan(50)
  })

  it('names the field that changed, with the value before and after', () => {
    const diff = diffConfigs(validConfig(), brokenConfig())
    const rudi = diff.changed.find((e) => e.kind === 'postava' && e.id === 'Rudi')
    expect(rudi?.changes).toEqual(
      expect.arrayContaining([
        { field: 'sablona', before: 'T_Rudi', after: '' },
        {
          field: 'pocatecni_hodnoty',
          before: 'Control=4, Regime=2, Wealth_osobni=7, Wealth_spolecny=7',
          after: 'Control=4, Regime=2, Wealth_osobni=14, Wealth_spolecny=7',
        },
      ]),
    )
  })

  it('reports a changed condition on a variant', () => {
    const diff = diffConfigs(validConfig(), brokenConfig())
    const variation = diff.changed.find((e) => e.id === 'V_Karel_2_Prace_1_A')
    expect(variation?.changes?.[0]).toMatchObject({
      field: 'podminka',
      before: 'A_Karel_2_1_Ano AND F_Udavac',
      after: 'A_Karel_2_1_Mozna AND F_Udavac',
    })
  })

  it('reports a scale that lost its merge strategy', () => {
    const diff = diffConfigs(validConfig(), brokenConfig())
    const scale = diff.changed.find(
      (e) => e.kind === 'skala' && e.id === 'Wealth_spolecny' && e.chapter === 1,
    )
    expect(scale?.changes).toEqual(
      expect.arrayContaining([{ field: 'slouceni', before: 'otazka', after: '' }]),
    )
  })

  it('separates added from removed entities', () => {
    const base = readWorkbook(readFileSync('documents/fixture-platny.xlsx'))
    const trimmed = new Map(base)
    const questions = [...(base.get('2_Questions') ?? [])]
    // Drop the last question's two rows (Rudi, chapter 2).
    trimmed.set('2_Questions', questions.slice(0, -2))

    const diff = diffConfigs(importWorkbook(base).config, importWorkbook(trimmed).config)
    expect(diff.removed.map((e) => e.id)).toEqual(
      expect.arrayContaining(['Q_Rudi_2_1', 'A_Rudi_2_1_Ano', 'A_Rudi_2_1_Ne']),
    )
    expect(diff.added).toEqual([])
  })

  it('keeps the chapter on every entity, so chapters are not confused', () => {
    const diff = diffConfigs(undefined, validConfig())
    const scales = diff.added.filter((e) => e.kind === 'skala' && e.id === 'Regime')
    expect(scales.map((s) => s.chapter).sort()).toEqual([1, 2])
  })
})
