/**
 * The engine on `fixture-platny.xlsx`: five characters, two chapters, a
 * marriage, personal and shared accounts, `RANDOM` and a flag carried from
 * chapter 1 into chapter 2. Numbered scenarios follow the session brief.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import {
  chapter1Answers,
  chapter2Answers,
  choose,
  loadFixtureConfig,
  runFixture,
  setValue,
} from '@/testing/fixture-run'
import {
  createInitialState,
  EngineInputError,
  evaluate,
  type EffectDefinition,
  type EngineConfig,
  type EvaluateResult,
  type Rule,
  type TraceEntry,
} from './index'

let fixture: EngineConfig

beforeAll(() => {
  fixture = loadFixtureConfig()
})

const freshConfig = (): EngineConfig => structuredClone(fixture)

const entriesOf = <K extends TraceEntry['kind']>(result: EvaluateResult, kind: K): Extract<TraceEntry, { kind: K }>[] =>
  result.trace.filter((entry): entry is Extract<TraceEntry, { kind: K }> => entry.kind === kind)

const variantOf = (result: EvaluateResult, blockId: string) => result.variants.find((variant) => variant.blockId === blockId)

const addEffect = (config: EngineConfig, optionId: string, effect: EffectDefinition): EngineConfig => {
  const option = config.questions.flatMap((question) => question.options).find((candidate) => candidate.id === optionId)
  if (!option) throw new Error(`no option ${optionId} in the fixture`)
  option.effects.push(effect)

  return config
}

const shift = (characterId: string, scaleKey: string, delta: number): EffectDefinition => ({
  kind: 'zmena_skaly',
  character: { from: 'postava', characterId },
  scaleKey,
  delta,
})

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }

  return value
}

const expectEngineError = (run: () => unknown, code: string): void => {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(EngineInputError)
    expect((error as EngineInputError).problems.map((problem) => problem.code)).toContain(code)

    return
  }
  throw new Error(`expected an EngineInputError with ${code}`)
}

describe('1. an answer shifts a scale', () => {
  it('adds the impact and explains it with its source', () => {
    const { chapter1 } = runFixture({ config: freshConfig() })

    expect(chapter1.state.characters['Marie']?.scales['Control']).toBe(5)
    const [entry] = entriesOf(chapter1, 'zmena_skaly').filter(
      (candidate) => candidate.owner.kind === 'postava' && candidate.owner.characterId === 'Marie' && candidate.scaleKey === 'Control',
    )
    expect(entry).toMatchObject({
      phase: 'hodnotove',
      before: 2,
      raw: 5,
      after: 5,
      contributions: [
        { source: { kind: 'odpoved', characterId: 'Marie', questionId: 'Q_Marie_1_1', optionId: 'A_Marie_1_1_Marie' }, delta: 3 },
      ],
    })
  })

  it('writes the trace even when the contributions cancel out', () => {
    const config = addEffect(freshConfig(), 'A_Marie_2_4_Ano', shift('Marie', 'Control', -2))
    const { chapter2 } = runFixture({ config })

    const entry = entriesOf(chapter2, 'zmena_skaly').find(
      (candidate) => candidate.owner.kind === 'postava' && candidate.owner.characterId === 'Marie' && candidate.scaleKey === 'Control',
    )
    expect(entry).toMatchObject({ before: 5, after: 5 })
    expect(entry?.contributions.map((contribution) => contribution.delta).sort()).toEqual([-2, 2])
  })
})

describe('2. an absolute org setting applies before the shifts', () => {
  it('lands the shift on the value the org set, in either row order', () => {
    const config = addEffect(freshConfig(), 'A_Marie_2_4_Ano', shift('Marie', 'Wealth_osobni', 2))
    const reversed = structuredClone(config)
    reversed.questions.reverse()

    for (const variant of [config, reversed]) {
      const { chapter2 } = runFixture({ config: variant })
      expect(chapter2.state.characters['Marie']?.scales['Wealth_osobni']).toBe(5)

      const isMarieWealth = (entry: TraceEntry) =>
        'owner' in entry && entry.owner.kind === 'postava' && entry.owner.characterId === 'Marie' && entry.scaleKey === 'Wealth_osobni'
      const setIndex = chapter2.trace.findIndex((entry) => entry.kind === 'nastaveni_skaly' && isMarieWealth(entry))
      const shiftIndex = chapter2.trace.findIndex((entry) => entry.kind === 'zmena_skaly' && isMarieWealth(entry))
      expect(setIndex).toBeGreaterThanOrEqual(0)
      expect(setIndex).toBeLessThan(shiftIndex)
      expect(chapter2.trace[shiftIndex]).toMatchObject({ before: 3, after: 5 })
    }
  })
})

describe('3. a marriage creates a household with a single owner of the shared scale', () => {
  it('moves both partners into one new household', () => {
    const { chapter2 } = runFixture({ config: freshConfig() })
    const { characters, households } = chapter2.state

    expect(characters['Marie']?.householdId).toBe('H_2_Marie_Mirek')
    expect(characters['Mirek']?.householdId).toBe('H_2_Marie_Mirek')
    expect(households['H_2_Marie_Mirek']).toMatchObject({ memberIds: ['Marie', 'Mirek'], scales: { Wealth_spolecny: 8 } })
    expect(households['H_Marie']).toBeUndefined()
    expect(households['H_Mirek']).toBeUndefined()
    expect(characters['Marie']?.scales['Wealth_spolecny']).toBeUndefined()
    expect(chapter2.conflicts).toEqual([])
  })

  it('keeps both original values in the trace and leaves the `otazka` strategy to the org', () => {
    const { chapter2 } = runFixture({ config: freshConfig() })
    const [merge] = entriesOf(chapter2, 'domacnost_slouceni')

    expect(merge).toMatchObject({
      characterIds: ['Marie', 'Mirek'],
      sources: [{ kind: 'odpoved', questionId: 'Q_Marie_2_1', optionId: 'A_Marie_2_1_Mirek', filledByOrg: true }],
      before: [
        { householdId: 'H_Marie', scales: { Wealth_spolecny: 4 } },
        { householdId: 'H_Mirek', scales: { Wealth_spolecny: 6 } },
      ],
      after: { householdId: 'H_2_Marie_Mirek', memberIds: ['Marie', 'Mirek'], scales: {} },
      scales: [{ scaleKey: 'Wealth_spolecny', strategy: 'otazka', value: null, pending: 'otazka' }],
    })
    const [set] = entriesOf(chapter2, 'nastaveni_skaly').filter((entry) => entry.scaleKey === 'Wealth_spolecny')
    expect(set).toMatchObject({ owner: { kind: 'domacnost', householdId: 'H_2_Marie_Mirek', memberIds: ['Marie', 'Mirek'] }, before: null, after: 8 })
  })

  it('reports a shared value nobody set instead of computing one', () => {
    const config = freshConfig()
    config.questions = config.questions.filter((question) => question.id !== 'Q_Marie_2_3')
    const answers = chapter2Answers().filter((answer) => answer.questionId !== 'Q_Marie_2_3')
    const { chapter2 } = runFixture({ config, chapter2Answers: answers })

    expect(chapter2.conflicts).toEqual([
      {
        kind: 'nedopocitano',
        owner: { kind: 'domacnost', householdId: 'H_2_Marie_Mirek', memberIds: ['Marie', 'Mirek'] },
        scaleKey: 'Wealth_spolecny',
        reason: 'otazka',
      },
    ])
    // The variation reads the missing value, so it cannot be chosen yet.
    expect(variantOf(chapter2, 'B_Marie_2_Historie_1')).toMatchObject({ status: 'nerozhodnuto', variationId: null })
  })
})

describe('4. both spouses contribute to the shared scale', () => {
  it('sums the contributions and names who each came from', () => {
    let config = addEffect(freshConfig(), 'A_Marie_2_4_Ano', shift('Marie', 'Wealth_spolecny', 2))
    config = addEffect(config, 'A_Mirek_2_1_VALUE', shift('Mirek', 'Wealth_spolecny', -3))
    const { chapter2 } = runFixture({ config })

    expect(chapter2.state.households['H_2_Marie_Mirek']?.scales['Wealth_spolecny']).toBe(7)
    const [entry] = entriesOf(chapter2, 'zmena_skaly').filter((candidate) => candidate.scaleKey === 'Wealth_spolecny')
    expect(entry).toMatchObject({
      owner: { kind: 'domacnost', householdId: 'H_2_Marie_Mirek' },
      before: 8,
      after: 7,
      contributions: [
        { source: { kind: 'odpoved', characterId: 'Marie', questionId: 'Q_Marie_2_4' }, delta: 2 },
        { source: { kind: 'odpoved', characterId: 'Mirek', questionId: 'Q_Mirek_2_1' }, delta: -3 },
      ],
    })
  })
})

describe('5. a flag from chapter 1 conditions a variation in chapter 2', () => {
  it('picks the variation that needs F_Vedouci', () => {
    const { chapter2 } = runFixture({ config: freshConfig() })

    expect(chapter2.state.characters['Marie']?.flags['F_Vedouci']).toBe(true)
    expect(variantOf(chapter2, 'B_Marie_2_Prace_1')?.variationId).toBe('V_Marie_2_Prace_1_A')
    const [trace] = entriesOf(chapter2, 'varianta').filter((entry) => entry.blockId === 'B_Marie_2_Prace_1')
    expect(trace?.evaluations[0]?.readings).toEqual([
      { reference: 'A_Marie_2_4_Ano', value: true },
      { reference: 'F_Vedouci', value: true },
    ])
  })

  it('falls through when chapter 1 did not set the flag', () => {
    const config = freshConfig()
    const chapter1 = evaluate(
      createInitialState(config),
      { chapter: 1, answers: [choose('Q_Marie_1_1', 'A_Marie_1_1_Karel'), ...chapter1Answers().slice(1)], rolls: [] },
      config,
    )
    const answers = [choose('Q_Marie_1_1', 'A_Marie_1_1_Karel'), ...chapter1Answers().slice(1), ...chapter2Answers()]
    const chapter2 = evaluate(chapter1.state, { chapter: 2, answers, rolls: [] }, config)

    expect(variantOf(chapter2, 'B_Marie_2_Prace_1')?.variationId).toBe('V_Marie_2_Prace_1_B')
  })
})

describe('6. variation by priority, DEFAULT when nothing else holds', () => {
  it('takes the lowest priority that holds, even when a later one would too', () => {
    const { chapter2 } = runFixture({ config: freshConfig() })

    expect(variantOf(chapter2, 'B_Karel_2_Prace_1')).toMatchObject({ status: 'vybrana', variationId: 'V_Karel_2_Prace_1_A', text: 'Povýšili ho. Udání se vyplatilo.' })
    const [trace] = entriesOf(chapter2, 'varianta').filter((entry) => entry.blockId === 'B_Karel_2_Prace_1')
    expect(trace?.evaluations).toHaveLength(1)
  })

  it('falls back to DEFAULT', () => {
    const { chapter2 } = runFixture({ config: freshConfig() })

    expect(variantOf(chapter2, 'B_Vera_2_Historie_1')?.variationId).toBe('V_Vera_2_Historie_1_C')
    const [trace] = entriesOf(chapter2, 'varianta').filter((entry) => entry.blockId === 'B_Vera_2_Historie_1')
    expect(trace?.evaluations.map((evaluation) => evaluation.result)).toEqual(['neplati', 'neplati', 'plati'])
  })

  it('reads the shared account after the org set it', () => {
    const { chapter2 } = runFixture({ config: freshConfig() })

    expect(variantOf(chapter2, 'B_Marie_2_Historie_1')?.variationId).toBe('V_Marie_2_Historie_1_A')
  })
})

describe('7. clamping at a scale bound', () => {
  it('clamps and writes it to the trace', () => {
    const config = freshConfig()
    const karel = config.characters.find((character) => character.id === 'Karel')
    if (karel) karel.initialScales['Regime'] = 9
    const { chapter1 } = runFixture({ config })

    expect(chapter1.state.characters['Karel']?.scales['Regime']).toBe(10)
    expect(entriesOf(chapter1, 'orez')).toEqual([
      { phase: 'hodnotove', kind: 'orez', owner: { kind: 'postava', characterId: 'Karel' }, scaleKey: 'Regime', raw: 11, after: 10, bound: 'max' },
    ])
  })
})

describe('8. the same input gives the same output, bit for bit', () => {
  it('repeats exactly and never touches its input', () => {
    const config = deepFreeze(freshConfig())
    const start = deepFreeze(createInitialState(config))
    const inputs = deepFreeze({ chapter: 1 as const, answers: chapter1Answers(), rolls: [] })

    const first = JSON.stringify(evaluate(start, inputs, config))
    const second = JSON.stringify(evaluate(start, inputs, config))
    expect(second).toBe(first)
  })

  it('does not depend on row order in the sheet or on answer order', () => {
    const shuffled = freshConfig()
    shuffled.characters.reverse()
    shuffled.scales.reverse()
    shuffled.questions.reverse()
    for (const question of shuffled.questions) question.options.reverse()
    shuffled.blocks.reverse()
    for (const block of shuffled.blocks) block.variations.reverse()

    const straight = runFixture({ config: freshConfig() })
    const chapter1 = evaluate(createInitialState(shuffled), { chapter: 1, answers: chapter1Answers().reverse(), rolls: [] }, shuffled)
    const chapter2 = evaluate(
      chapter1.state,
      { chapter: 2, answers: [...chapter2Answers(), ...chapter1Answers()].reverse(), rolls: [] },
      shuffled,
    )

    expect(JSON.stringify(chapter1)).toBe(JSON.stringify(straight.chapter1))
    expect(JSON.stringify(chapter2)).toBe(JSON.stringify(straight.chapter2))
  })
})

describe('9. a stored roll does not change on recomputation', () => {
  const singleMarie = () => [
    choose('Q_Marie_2_1', 'A_Marie_2_1_Nikdo'),
    setValue('Q_Marie_2_2', 5),
    ...chapter2Answers().filter((answer) => answer.questionId !== 'Q_Marie_2_1' && answer.questionId !== 'Q_Marie_2_2'),
  ]
  const roll = (value: number) => [{ ownerKind: 'varianta' as const, ownerId: 'V_Marie_2_Historie_1_D', characterId: 'Marie', value }]

  it('asks for the roll it needs and decides nothing without it', () => {
    const { chapter2 } = runFixture({ config: freshConfig(), chapter2Answers: singleMarie() })

    expect(chapter2.missingRolls).toEqual([{ ownerKind: 'varianta', ownerId: 'V_Marie_2_Historie_1_D', characterId: 'Marie' }])
    expect(variantOf(chapter2, 'B_Marie_2_Historie_1')).toMatchObject({ status: 'nerozhodnuto', variationId: null })
  })

  it('uses the stored roll and gives the same result every time', () => {
    const config = freshConfig()
    const first = runFixture({ config, chapter2Answers: singleMarie(), chapter2Rolls: roll(30) }).chapter2
    const again = runFixture({ config, chapter2Answers: singleMarie(), chapter2Rolls: roll(30) }).chapter2

    expect(first.missingRolls).toEqual([])
    expect(variantOf(first, 'B_Marie_2_Historie_1')?.variationId).toBe('V_Marie_2_Historie_1_D')
    expect(JSON.stringify(again)).toBe(JSON.stringify(first))
    expect(variantOf(runFixture({ config, chapter2Answers: singleMarie(), chapter2Rolls: roll(80) }).chapter2, 'B_Marie_2_Historie_1')?.variationId).toBe(
      'V_Marie_2_Historie_1_E',
    )
  })

  it('does not ask for a roll the result cannot depend on', () => {
    const { chapter2 } = runFixture({ config: freshConfig() })

    expect(chapter2.missingRolls).toEqual([])
  })
})

describe('10. a conflict of two rules with the same priority is returned, not dropped', () => {
  const flagRule = (id: string, priority: number, value: boolean, isExclusion = false): Rule => ({
    id,
    chapter: 2,
    characterId: 'Rudi',
    priority,
    condition: 'A_Rudi_2_1_Ano',
    isExclusion,
    appliesOncePerHousehold: false,
    effects: [{ kind: 'priznak', flagId: 'F_Stehovani', value }],
  })

  it('applies neither and hands both to the org', () => {
    const config = freshConfig()
    config.rules = [flagRule('R_Zustava', 1, false), flagRule('R_Odchazi', 1, true)]
    const { chapter2 } = runFixture({ config })

    expect(chapter2.conflicts).toEqual([
      {
        kind: 'stejna_priorita',
        subject: { kind: 'priznak', characterId: 'Rudi', flagId: 'F_Stehovani' },
        priority: 1,
        candidates: [
          { effect: { kind: 'priznak', characterId: 'Rudi', flagId: 'F_Stehovani', value: true }, sources: [{ kind: 'pravidlo', ruleId: 'R_Odchazi', characterId: 'Rudi' }] },
          { effect: { kind: 'priznak', characterId: 'Rudi', flagId: 'F_Stehovani', value: false }, sources: [{ kind: 'pravidlo', ruleId: 'R_Zustava', characterId: 'Rudi' }] },
        ],
      },
    ])
    expect(entriesOf(chapter2, 'konflikt')).toEqual([{ phase: 'hodnotove', kind: 'konflikt', conflictIndex: 0 }])
    expect(chapter2.state.characters['Rudi']?.flags['F_Stehovani']).toBeUndefined()
  })

  it('lets the higher priority win and records what it overrode', () => {
    const config = freshConfig()
    config.rules = [flagRule('R_Zustava', 1, false)]
    const { chapter2 } = runFixture({ config })

    expect(chapter2.conflicts).toEqual([])
    expect(chapter2.state.characters['Rudi']?.flags['F_Stehovani']).toBe(false)
    expect(entriesOf(chapter2, 'prekonano')).toMatchObject([
      { source: { kind: 'odpoved', optionId: 'A_Rudi_2_1_Ano' }, priority: 0, winners: [{ ruleId: 'R_Zustava' }], winnerPriority: 1 },
    ])
  })

  it('lets an exclusion win over assignment regardless of priority', () => {
    const config = freshConfig()
    config.rules = [flagRule('R_Nikam', -5, true, true)]
    const { chapter2 } = runFixture({ config })

    expect(chapter2.state.characters['Rudi']?.flags['F_Stehovani']).toBeUndefined()
    expect(entriesOf(chapter2, 'vylouceni')).toMatchObject([
      { source: { optionId: 'A_Rudi_2_1_Ano' }, excludedBy: [{ ruleId: 'R_Nikam' }] },
    ])
  })
})

describe('bad input fails loudly', () => {
  it('lists every missing answer at once', () => {
    const config = freshConfig()
    expectEngineError(() => evaluate(createInitialState(config), { chapter: 1, answers: [], rolls: [] }, config), 'chybi_odpoved')
  })

  it('treats an unknown identifier as an error, even behind a false AND', () => {
    const config = freshConfig()
    const block = config.blocks.find((candidate) => candidate.id === 'B_Vera_2_Historie_1')
    const variation = block?.variations[0]
    if (variation) variation.condition = 'A_Vera_2_1_Ano AND F_Ve_strane_preklep'

    expectEngineError(() => runFixture({ config }), 'neznamy_identifikator')
  })

  it('refuses a state from the wrong chapter', () => {
    const config = freshConfig()
    expectEngineError(() => evaluate(createInitialState(config), { chapter: 2, answers: [], rolls: [] }, config), 'nesouhlasi_kapitola')
  })
})
