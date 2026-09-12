/**
 * The import end to end, on the real fixtures in `documents/`.
 *
 * `fixture-platny.xlsx` must come out usable; `fixture-vadny.xlsx` carries
 * deliberate mistakes and must be refused with all of them listed at once.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { importWorkbook, importXlsx } from './import-config'
import type { ImportResult } from './types/import-result'
import type { Workbook } from './types/parsed-config'

const valid = () => importXlsx(readFileSync('documents/fixture-platny.xlsx'))
const broken = () => importXlsx(readFileSync('documents/fixture-vadny.xlsx'))

/** Issues of one code, for readable assertions. */
const byCode = (result: ImportResult, code: string) =>
  result.issues.filter((i) => i.code === code)

describe('fixture-platny.xlsx', () => {
  it('is usable — no errors', () => {
    const result = valid()
    expect(result.errors.map((e) => `${e.code} ${e.location.sheet}${e.location.cell ?? ''}`)).toEqual(
      [],
    )
    expect(result.usable).toBe(true)
  })

  it('reads the chapters, characters and groups it carries', () => {
    const result = valid()
    expect(result.config.chapters).toEqual([1, 2])
    expect(result.config.characters.map((c) => c.externalId)).toEqual([
      'Marie',
      'Mirek',
      'Karel',
      'Vera',
      'Rudi',
    ])
    expect(result.config.groups.map((g) => g.name)).toEqual(['Srdce party', 'Podnik'])
  })

  it('keeps diacritics in names and labels intact', () => {
    const marie = valid().config.characters.find((c) => c.externalId === 'Marie')
    expect(marie?.lastName).toBe('Balážová')
    const regime = valid().config.scales.get(1)?.find((s) => s.key === 'Regime')
    expect(regime?.label).toBe('Vztah k režimu')
    expect(regime?.bands.map((b) => b.name)).toEqual([
      'Odpůrkyně',
      'Vlažná',
      'Souhlasná',
      'Oddaná',
    ])
  })

  it('reads the starting values for chapter 1', () => {
    const marie = valid().config.characters.find((c) => c.externalId === 'Marie')
    expect(marie?.initialScales['Wealth_osobni']?.value).toBe(4)
    expect(marie?.initialScales['Regime']?.value).toBe(6)
  })

  it('reads scale scope and bands from data, not from code', () => {
    const scales = valid().config.scales.get(1) ?? []
    const shared = scales.find((s) => s.key === 'Wealth_spolecny')
    expect(shared?.scope).toBe('domacnost')
    expect(shared?.mergeStrategy).toBe('otazka')
    const control = scales.find((s) => s.key === 'Control')
    expect(control?.bands).toEqual([
      { ordinal: 1, min: 1, max: 4, name: 'Bez vlivu' },
      { ordinal: 2, min: 5, max: 7, name: 'Slyšena' },
      { ordinal: 3, min: 8, max: 10, name: 'Rozhoduje' },
    ])
  })

  it('fills merged Question ID cells down onto the answer rows', () => {
    const questions = valid().config.questions.get(1) ?? []
    const first = questions.find((q) => q.externalId === 'Q_Marie_1_1')
    expect(first?.options.map((o) => o.externalId)).toEqual([
      'A_Marie_1_1_Karel',
      'A_Marie_1_1_Vera',
      'A_Marie_1_1_Marie',
    ])
  })

  it('reads the org question source and the paired flag', () => {
    const questions = valid().config.questions.get(2) ?? []
    const marriage = questions.find((q) => q.externalId === 'Q_Marie_2_1')
    expect(marriage?.source).toBe('org')
    expect(marriage?.isPaired).toBe(true)
    // §6.7: the marriage is entered once and the partner comes from the option.
    const mirek = marriage?.options.find((o) => o.externalId === 'A_Marie_2_1_Mirek')
    expect(mirek?.referencedCharacter).toBe('Mirek')
    expect(mirek?.effects).toEqual([{ name: 'SNATEK', argument: 'Mirek', raw: 'SNATEK(Mirek)' }])
  })

  it('reads scale_direct as an absolute set fed by the answer', () => {
    const questions = valid().config.questions.get(2) ?? []
    const direct = questions.find((q) => q.externalId === 'Q_Marie_2_3')
    expect(direct?.type).toBe('scale_direct')
    expect(direct?.scaleKey).toBe('Wealth_spolecny')
    expect(direct?.options[0]?.impacts[0]).toMatchObject({ mode: 'absolutni', fromAnswer: true })
  })

  it('fills merged Block ID cells down onto the variation rows', () => {
    const blocks = valid().config.blocks.get(2) ?? []
    const historie = blocks.find((b) => b.externalId === 'B_Marie_2_Historie_1')
    expect(historie?.variations.map((v) => v.priority)).toEqual([1, 2, 3, 4, 5])
    expect(historie?.characterRef).toBe('Marie')
  })

  it('parses every condition in the sheet without a syntax error', () => {
    const result = valid()
    expect(byCode(result, 'vadny_vyraz')).toEqual([])
  })

  it('counts the merged cells it filled down, for the import summary', () => {
    expect(valid().config.repairs.filledDownCells).toBeGreaterThan(0)
  })

  it('warns that the Character column holds a name instead of a registry ID', () => {
    const warnings = byCode(valid(), 'neznama_postava')
    expect(warnings).toHaveLength(2)
    expect(warnings[0]?.severity).toBe('varovani')
    expect(warnings[0]?.suggestion).toBe('Vera')
    // Resolved, so the question still belongs to a character.
    const vera = (valid().config.questions.get(1) ?? []).find(
      (q) => q.externalId === 'Q_Vera_1_1',
    )
    expect(vera?.characterId).toBe('Vera')
  })

  it('warns that chapter 1 never touches the joint account (§11.9)', () => {
    expect(byCode(valid(), 'osamely_ucet')).toHaveLength(1)
  })
})

describe('fixture-vadny.xlsx', () => {
  it('is refused', () => {
    expect(broken().usable).toBe(false)
  })

  it('reports every deliberate mistake in one pass, not just the first', () => {
    const codes = broken().errors.map((e) => e.code)
    expect(new Set(codes)).toEqual(
      new Set([
        'vadny_vyraz',
        'postava_bez_sablony',
        'hodnota_mimo_rozsah',
        'domacnostni_skala_bez_strategie',
        'neznama_skala',
        'neznamy_blok',
        'neznama_odpoved',
      ]),
    )
  })

  it('points at the cell of the unclosed bracket (2_Content G5)', () => {
    const issue = byCode(broken(), 'vadny_vyraz')[0]
    expect(issue?.location).toMatchObject({ sheet: '2_Content', cell: 'G5', column: 'Conditions' })
    expect(issue?.message).toContain('uzavírací závorka')
  })

  it('suggests the right scale for the typo (2_Questions I5)', () => {
    const issue = byCode(broken(), 'neznama_skala')[0]
    expect(issue?.location).toMatchObject({ sheet: '2_Questions', row: 5 })
    expect(issue?.value).toBe('S_Marie_Wealth_spolecnyy')
    expect(issue?.suggestion).toBe('S_Marie_Wealth_spolecny')
  })

  it('reports the answer a condition invents (2_Content G10)', () => {
    const issue = byCode(broken(), 'neznama_odpoved')[0]
    expect(issue?.value).toBe('A_Karel_2_1_Mozna')
    expect(issue?.location.sheet).toBe('2_Content')
  })

  it('reports the block no Content sheet defines (2_Questions J9)', () => {
    expect(byCode(broken(), 'neznamy_blok')[0]?.value).toBe('B_Mirek_2_Prace_9')
  })

  it('reports the character left without a template (Characters E6)', () => {
    expect(byCode(broken(), 'postava_bez_sablony')[0]?.value).toBe('Rudi')
  })

  it('reports the starting value outside the scale range (Characters F6)', () => {
    const issue = byCode(broken(), 'hodnota_mimo_rozsah')[0]
    expect(issue?.location.cell).toBe('F6')
    expect(issue?.message).toContain('14')
  })

  it('reports the household scale stripped of its strategies (1_Scales H3:I3)', () => {
    const issue = byCode(broken(), 'domacnostni_skala_bez_strategie')[0]
    expect(issue?.value).toBe('Wealth_spolecny')
    expect(issue?.message).toContain('Slouceni')
  })

  it('catches the knock-on effect of the scale typo: nothing touches the joint account', () => {
    // The typo in 2_Questions I5 means no answer reaches `Wealth_spolecny` in
    // chapter 2, which §11.9 flags independently of the reference check.
    const chapters = byCode(broken(), 'osamely_ucet').map((i) => i.message)
    expect(chapters.some((m) => m.includes('kapitole 2'))).toBe(true)
  })
})

/**
 * Two checks the faulty fixture's own legend claims but does not actually
 * contain, so they are exercised on a hand-built sheet instead.
 */
describe('checks the faulty fixture claims but does not carry', () => {
  const minimal = (contentRows: string[][]): Workbook =>
    new Map<string, string[][]>([
      [
        'Characters',
        [
          ['Character ID', 'Jmeno', 'Prijmeni', 'Skupina', 'Template ID', 'S_Regime'],
          ['Marie', 'Marie', 'Balážová', 'Srdce party', 'T_Marie', '5'],
        ],
      ],
      [
        '2_Scales',
        [
          ['Scale ID', 'Nazev', 'Rozsah', 'Min', 'Max', 'Prahy', 'Nazvy pasem'],
          ['Regime', 'Režim', 'postava', '1', '10', '1-5;6-10', 'Nízko;Vysoko'],
        ],
      ],
      [
        '2_Questions',
        [
          ['Question ID', 'Character', 'Text', 'Typ', 'Zdroj', 'Answer ID', 'Answer Text', 'Scale Impact'],
          ['Q_Marie_2_1', 'Marie', 'Otázka?', 'bool', 'hráč', 'A_Marie_2_1_Ano', 'Ano', 'S_Marie_Regime+1'],
          ['', '', '', '', '', 'A_Marie_2_1_Ne', 'Ne', ''],
        ],
      ],
      [
        '2_Content',
        [
          ['Character', 'Block ID', 'Variation ID', 'Variation Description', 'Variation Text', 'Priority', 'Conditions'],
          ...contentRows,
        ],
      ],
    ])

  it('two variants of one block sharing a priority is an error', () => {
    const result = importWorkbook(
      minimal([
        ['Marie', 'B_Marie_2_X', 'V_A', '', 'Text A', '1', 'A_Marie_2_1_Ano'],
        ['', '', 'V_B', '', 'Text B', '2', 'A_Marie_2_1_Ne'],
        ['', '', 'V_C', '', 'Text C', '2', 'DEFAULT'],
      ]),
    )
    const issue = result.errors.find((e) => e.code === 'stejna_priorita')
    expect(issue?.message).toContain('`V_B`')
    expect(issue?.message).toContain('`V_C`')
  })

  it('a block without a DEFAULT variant is an error', () => {
    const result = importWorkbook(
      minimal([
        ['Marie', 'B_Marie_2_X', 'V_A', '', 'Text A', '1', 'A_Marie_2_1_Ano'],
        ['', '', 'V_B', '', 'Text B', '2', 'A_Marie_2_1_Ne'],
      ]),
    )
    expect(result.errors.some((e) => e.code === 'blok_bez_default')).toBe(true)
  })

  it('a variant standing after DEFAULT can never be reached', () => {
    const result = importWorkbook(
      minimal([
        ['Marie', 'B_Marie_2_X', 'V_A', '', 'Text A', '1', 'DEFAULT'],
        ['', '', 'V_B', '', 'Text B', '2', 'A_Marie_2_1_Ano'],
      ]),
    )
    expect(result.warnings.some((w) => w.code === 'nedosazitelna_varianta')).toBe(true)
  })

  it('a missing required sheet is reported, not thrown', () => {
    const result = importWorkbook(new Map())
    expect(result.usable).toBe(false)
    expect(result.errors[0]?.code).toBe('chybejici_list')
  })

  it('a missing required column is reported with the column name', () => {
    const workbook = minimal([['Marie', 'B_1', 'V_A', '', 'T', '1', 'DEFAULT']])
    workbook.set('Characters', [
      ['Character ID', 'Jmeno'],
      ['Marie', 'Marie'],
    ])
    const result = importWorkbook(workbook)
    const issue = result.errors.find((e) => e.code === 'chybejici_sloupec')
    expect(issue?.value).toBe('Prijmeni')
  })
})
