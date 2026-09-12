/**
 * Sample data — one run, three characters, one group, five scales.
 *
 * Its purpose is a shape in the database showing how the tables fit together.
 * It is not the game's configuration: that is imported from `.xlsx` (§10.2).
 *
 * The data deliberately exercises the least obvious parts of the model: the
 * `_osobni` / `_spolecny` pair of accounts (§4.4), an org paired question
 * (§6.7), and marriage as a structural rule effect (§7.3).
 *
 * Re-runnable: it first drops the run `2026-09-12_A` if it exists. This is the
 * only place in the project that deletes data, and only because it is a seed
 * run in a local database.
 */
import 'dotenv/config'
import { eq, sql } from 'drizzle-orm'
import { unscopedDb, rawSql } from '../src/db/client'
import type { RunScopedTable } from '../src/db/run-scope'
import {
  answerOptions,
  auditLog,
  characterFlags,
  characterScaleValues,
  characterScales,
  characterVariables,
  characters,
  chapters,
  configVersions,
  effects,
  flags,
  groupMemberships,
  groups,
  householdMemberships,
  householdScaleValues,
  households,
  questions,
  ruleConditions,
  rules,
  scaleBands,
  scales,
  runs,
} from '../src/db/schema'

const RUN_ID = '2026-09-12_A'
const AUTHOR = 'seed skript'

/** Default band split 1–3 / 4–5 / 6–8 / 9–10 (§4.1); names are per scale. */
const BAND_BOUNDS = [
  { ordinal: 1, minValue: 1, maxValue: 3 },
  { ordinal: 2, minValue: 4, maxValue: 5 },
  { ordinal: 3, minValue: 6, maxValue: 8 },
  { ordinal: 4, minValue: 9, maxValue: 10 },
] as const

type ScaleSeed = {
  key: string
  label: string
  description: string
  scope: 'postava' | 'domacnost'
  mergeStrategy?: 'soucet' | 'prumer' | 'vyssi' | 'otazka'
  splitStrategy?: 'kopie' | 'polovina' | 'otazka'
  bandNames: [string, string, string, string]
}

/**
 * The private and the joint account are two separate scales with different
 * scopes, not one scale switched into shared mode (§4.4).
 */
const SCALE_SEED: ScaleSeed[] = [
  {
    key: 'Wealth_osobni',
    label: 'Majetek — osobní',
    description: 'Co má postava vlastního, mimo společný účet.',
    scope: 'postava',
    bandNames: ['Na dně', 'Vyžije', 'Zajištěná', 'Zazobaná'],
  },
  {
    key: 'Wealth_spolecny',
    label: 'Majetek — společný',
    description: 'Společný účet domácnosti.',
    scope: 'domacnost',
    // Money is neither merged nor split automatically: how much each partner
    // contributed is a question in the questionnaire (§4.4).
    mergeStrategy: 'otazka',
    splitStrategy: 'otazka',
    bandNames: ['Prázdný', 'Něco tam je', 'Slušná rezerva', 'Na auto'],
  },
  {
    key: 'Bony',
    label: 'Bony',
    description: 'Tuzexové bony domácnosti.',
    scope: 'domacnost',
    // For Bony, on the other hand, an automatic merge does make sense.
    mergeStrategy: 'soucet',
    splitStrategy: 'kopie',
    bandNames: ['Žádné', 'Pár', 'Zásoba', 'Hromada'],
  },
  {
    key: 'Regime',
    label: 'Přesvědčení o režimu',
    description: 'Jak se postava staví ke komunistickému režimu.',
    scope: 'postava',
    bandNames: ['Otevřeně proti', 'Skeptička', 'Loajální', 'Přesvědčená'],
  },
  {
    key: 'Control',
    label: 'Kontrola nad organizací',
    description: 'Jak velký vliv má postava ve své skupině.',
    scope: 'postava',
    bandNames: ['Bez vlivu', 'Slyší ji', 'Rozhoduje', 'Drží to v ruce'],
  },
]

const FLAG_SEED = [
  { key: 'Svatba', label: 'Svatba', description: 'Postava se v kapitole vdala nebo oženila.' },
  { key: 'Firemni_byt', label: 'Firemní byt', description: 'Postava získala byt od organizace.' },
  {
    key: 'Spolecny_ucet',
    label: 'Společný účet',
    description:
      'Řídí, zda se společný účet vůbec objeví v dokumentu. Svobodná postava ho technicky má, ale netiskne se (§4.4).',
  },
] as const

/** Marie's starting scale values for chapter 1 (`Characters` sheet, §4.2). */
const MARIE_INITIAL: Record<string, number> = {
  Wealth_osobni: 4,
  Wealth_spolecny: 1,
  Bony: 2,
  Regime: 6,
  Control: 3,
}

async function wipeSeedRun() {
  // Delete dependents first — the foreign keys are `restrict`.
  const order: RunScopedTable[] = [
    auditLog,
    characterVariables,
    characterFlags,
    characterScaleValues,
    householdScaleValues,
    householdMemberships,
    households,
    groupMemberships,
    effects,
    ruleConditions,
    rules,
    answerOptions,
    questions,
    characterScales,
    scaleBands,
    scales,
    flags,
    characters,
    groups,
    chapters,
    configVersions,
  ]
  for (const table of order) {
    await unscopedDb.delete(table).where(eq(table.runId, RUN_ID))
  }
  await unscopedDb.delete(runs).where(eq(runs.id, RUN_ID))
}

async function main() {
  await wipeSeedRun()

  await unscopedDb.insert(runs).values({
    id: RUN_ID,
    startDate: '2026-09-12',
    letter: 'A',
    label: 'Ukázkový běh (seed)',
    status: 'aktivni',
    createdBy: AUTHOR,
  })

  const [configVersion] = await unscopedDb
    .insert(configVersions)
    .values({
      runId: RUN_ID,
      version: 1,
      isActive: true,
      sourceFilename: 'seed.xlsx',
      sourceHash: 'seed',
      note: 'Ukázková data ze seed skriptu, ne skutečná konfigurace hry.',
      createdBy: AUTHOR,
    })
    .returning()
  if (!configVersion) throw new Error('Nepodařilo se založit verzi konfigurace.')
  const configVersionId = configVersion.id

  // All three chapters are created with the run so config import has something
  // to attach questions to (§3.2).
  const chapterRows = await unscopedDb
    .insert(chapters)
    .values([1, 2, 3].map((number) => ({ runId: RUN_ID, number, status: 'rozpracovana' as const })))
    .returning()
  const chapter1 = chapterRows.find((row) => row.number === 1)
  if (!chapter1) throw new Error('Nepodařilo se založit kapitoly.')

  const [srdceParty] = await unscopedDb
    .insert(groups)
    .values({
      runId: RUN_ID,
      externalId: 'G_SrdceParty',
      name: 'Srdce party',
      sourceConfigVersionId: configVersionId,
    })
    .returning()
  if (!srdceParty) throw new Error('Nepodařilo se založit skupinu.')

  const characterRows = await unscopedDb
    .insert(characters)
    .values([
      {
        runId: RUN_ID,
        externalId: 'Marie',
        firstName: 'Marie',
        lastName: 'Balážová',
        birthYear: 1955,
        homeGroupId: srdceParty.id,
        templateExternalId: 'T_Marie',
        sourceConfigVersionId: configVersionId,
      },
      {
        runId: RUN_ID,
        externalId: 'Karel',
        firstName: 'Karel',
        lastName: 'Novotný',
        birthYear: 1952,
        homeGroupId: srdceParty.id,
        templateExternalId: 'T_Karel',
        sourceConfigVersionId: configVersionId,
      },
      {
        runId: RUN_ID,
        externalId: 'Mirek',
        firstName: 'Mirek',
        lastName: 'Pokorný',
        birthYear: 1953,
        homeGroupId: srdceParty.id,
        templateExternalId: 'T_Mirek',
        sourceConfigVersionId: configVersionId,
      },
    ])
    .returning()
  const byExternalId = new Map(characterRows.map((row) => [row.externalId, row]))
  const marie = byExternalId.get('Marie')
  const karel = byExternalId.get('Karel')
  const mirek = byExternalId.get('Mirek')
  if (!marie || !karel || !mirek) throw new Error('Nepodařilo se založit postavy.')

  // Every character gets a household of one, so a single character holds shared
  // values alone and the engine needs no "no household" branch (§4.4).
  const householdByCharacter = new Map<string, string>()
  for (const character of characterRows) {
    const [household] = await unscopedDb
      .insert(households)
      .values({
        runId: RUN_ID,
        externalId: `H_${character.externalId}`,
        label: `${character.firstName} ${character.lastName}`,
        createdInChapterId: chapter1.id,
      })
      .returning()
    if (!household) throw new Error(`Nepodařilo se založit domácnost pro ${character.externalId}.`)
    householdByCharacter.set(character.id, household.id)

    await unscopedDb.insert(householdMemberships).values({
      runId: RUN_ID,
      chapterId: chapter1.id,
      characterId: character.id,
      householdId: household.id,
      source: 'pocatecni',
    })
  }

  // Scales and their bands. Thresholds and names live in data, never in code (§4.1).
  const scaleIdByKey = new Map<string, string>()
  const scopeByKey = new Map<string, 'postava' | 'domacnost'>()
  const bandIdByScaleAndOrdinal = new Map<string, string>()
  for (const definition of SCALE_SEED) {
    const [scale] = await unscopedDb
      .insert(scales)
      .values({
        runId: RUN_ID,
        key: definition.key,
        label: definition.label,
        description: definition.description,
        scope: definition.scope,
        mergeStrategy: definition.mergeStrategy ?? null,
        splitStrategy: definition.splitStrategy ?? null,
        sourceConfigVersionId: configVersionId,
      })
      .returning()
    if (!scale) throw new Error(`Nepodařilo se založit škálu ${definition.key}.`)
    scaleIdByKey.set(definition.key, scale.id)
    scopeByKey.set(definition.key, definition.scope)

    const bands = await unscopedDb
      .insert(scaleBands)
      .values(
        BAND_BOUNDS.map((bounds, index) => ({
          runId: RUN_ID,
          scaleId: scale.id,
          ...bounds,
          name: definition.bandNames[index]!,
        })),
      )
      .returning()
    for (const band of bands) {
      bandIdByScaleAndOrdinal.set(`${scale.id}:${band.ordinal}`, band.id)
    }
  }

  const flagRows = await unscopedDb
    .insert(flags)
    .values(
      FLAG_SEED.map((flag) => ({
        runId: RUN_ID,
        key: flag.key,
        label: flag.label,
        description: flag.description,
        sourceConfigVersionId: configVersionId,
      })),
    )
    .returning()
  const flagIdByKey = new Map(flagRows.map((row) => [row.key, row.id]))

  const bandFor = (scaleId: string, value: number) =>
    bandIdByScaleAndOrdinal.get(
      `${scaleId}:${BAND_BOUNDS.find((b) => value >= b.minValue && value <= b.maxValue)!.ordinal}`,
    )

  for (const [key, initialValue] of Object.entries(MARIE_INITIAL)) {
    const scaleId = scaleIdByKey.get(key)!

    // `character_scales` stays the registry of which scales a character tracks,
    // shared ones included: the starting value comes per character from the
    // `Characters` sheet and lands in that character's household of one.
    await unscopedDb.insert(characterScales).values({
      runId: RUN_ID,
      characterId: marie.id,
      scaleId,
      externalId: `S_Marie_${key}`,
      initialValue,
      sourceConfigVersionId: configVersionId,
    })

    // A shared value belongs to the household, a character scale to the character (§4.4).
    if (scopeByKey.get(key) === 'domacnost') {
      await unscopedDb.insert(householdScaleValues).values({
        runId: RUN_ID,
        chapterId: chapter1.id,
        householdId: householdByCharacter.get(marie.id)!,
        scaleId,
        value: initialValue,
        source: 'pocatecni',
        bandId: bandFor(scaleId, initialValue),
      })
    } else {
      await unscopedDb.insert(characterScaleValues).values({
        runId: RUN_ID,
        chapterId: chapter1.id,
        characterId: marie.id,
        scaleId,
        value: initialValue,
        source: 'pocatecni',
        bandId: bandFor(scaleId, initialValue),
      })
    }
  }

  // Single Marie technically has a joint account, but it stays out of the
  // document: a flag drives display, not the existence of a value (§4.4).
  await unscopedDb.insert(characterFlags).values({
    runId: RUN_ID,
    chapterId: chapter1.id,
    characterId: marie.id,
    flagId: flagIdByKey.get('Spolecny_ucet')!,
    value: false,
    source: 'pocatecni',
  })

  await unscopedDb.insert(groupMemberships).values({
    runId: RUN_ID,
    chapterId: chapter1.id,
    characterId: marie.id,
    groupId: srdceParty.id,
    role: 'clen',
    source: 'pocatecni',
  })

  await unscopedDb.insert(characterVariables).values([
    {
      runId: RUN_ID,
      chapterId: chapter1.id,
      characterId: marie.id,
      key: 'PRIJMENI',
      value: 'Balážová',
      source: 'pocatecni',
    },
    {
      runId: RUN_ID,
      chapterId: chapter1.id,
      characterId: marie.id,
      key: 'VEK',
      value: '30',
      source: 'pocatecni',
    },
  ])

  // --- Player question (§6.6): always bound to one character ---------------
  const [leaderQuestion] = await unscopedDb
    .insert(questions)
    .values({
      runId: RUN_ID,
      externalId: 'Q_Marie1_1',
      chapterId: chapter1.id,
      characterId: marie.id,
      ordinal: 1,
      type: 'single',
      source: 'hrac',
      text: 'Kdo z party se stal vedoucím směny?',
      sourceConfigVersionId: configVersionId,
    })
    .returning()
  if (!leaderQuestion) throw new Error('Nepodařilo se založit otázku o vedení směny.')

  // An option naming another character references their ID, not free text (§6.6).
  const leaderOptions = await unscopedDb
    .insert(answerOptions)
    .values([
      {
        runId: RUN_ID,
        externalId: 'A_Marie_1_1_Karel',
        questionId: leaderQuestion.id,
        ordinal: 1,
        label: 'Karel',
        referencedCharacterId: karel.id,
      },
      {
        runId: RUN_ID,
        externalId: 'A_Marie_1_1_Marie',
        questionId: leaderQuestion.id,
        ordinal: 2,
        label: 'Marie',
        referencedCharacterId: marie.id,
      },
    ])
    .returning()
  const optionKarel = leaderOptions.find((o) => o.externalId === 'A_Marie_1_1_Karel')
  const optionMarie = leaderOptions.find((o) => o.externalId === 'A_Marie_1_1_Marie')
  if (!optionKarel || !optionMarie) throw new Error('Nepodařilo se založit volby odpovědi.')

  // Layer 1 (§4.5): an answer's scale impact, `S_Marie_Wealth_osobni+3`. Also
  // shows a transfer between accounts — one effect over two scales (§4.4).
  await unscopedDb.insert(effects).values([
    {
      runId: RUN_ID,
      answerOptionId: optionKarel.id,
      ordinal: 1,
      kind: 'zmena_skaly',
      characterId: marie.id,
      scaleId: scaleIdByKey.get('Wealth_osobni')!,
      scaleDelta: -2,
    },
    {
      runId: RUN_ID,
      answerOptionId: optionKarel.id,
      ordinal: 2,
      kind: 'zmena_skaly',
      characterId: marie.id,
      scaleId: scaleIdByKey.get('Wealth_spolecny')!,
      scaleDelta: 2,
    },
    {
      runId: RUN_ID,
      answerOptionId: optionMarie.id,
      ordinal: 1,
      kind: 'zmena_skaly',
      characterId: marie.id,
      scaleId: scaleIdByKey.get('Control')!,
      scaleDelta: 2,
    },
    // Layer 2 (§4.5): the answer enables a template block directly, no rule.
    {
      runId: RUN_ID,
      answerOptionId: optionMarie.id,
      ordinal: 2,
      kind: 'blok',
      characterId: marie.id,
      blockExternalId: 'MARIE_VEDENI_SMENY',
    },
  ])

  // --- Org paired question (§6.7) ------------------------------------------
  // Marriages are entered by the orgs between chapters, never printed for
  // players, and recorded once — the other character sees it linked.
  const [marriageQuestion] = await unscopedDb
    .insert(questions)
    .values({
      runId: RUN_ID,
      externalId: 'Q_Marie1_2',
      chapterId: chapter1.id,
      characterId: marie.id,
      ordinal: 2,
      type: 'single',
      source: 'org',
      isPaired: true,
      text: 'Provdala se Marie, a za koho?',
      helpText: 'Zadává org po poradě. Tatáž odpověď se zobrazí i u druhé postavy.',
      sourceConfigVersionId: configVersionId,
    })
    .returning()
  if (!marriageQuestion) throw new Error('Nepodařilo se založit párovou otázku o sňatku.')

  const marriageOptions = await unscopedDb
    .insert(answerOptions)
    .values([
      {
        runId: RUN_ID,
        externalId: 'A_Marie_1_2_Mirek',
        questionId: marriageQuestion.id,
        ordinal: 1,
        label: 'Mirek Pokorný',
        referencedCharacterId: mirek.id,
      },
      {
        runId: RUN_ID,
        externalId: 'A_Marie_1_2_Karel',
        questionId: marriageQuestion.id,
        ordinal: 2,
        label: 'Karel Novotný',
        referencedCharacterId: karel.id,
      },
    ])
    .returning()
  const optionMirekSvatba = marriageOptions.find((o) => o.externalId === 'A_Marie_1_2_Mirek')
  if (!optionMirekSvatba) throw new Error('Nepodařilo se založit volby sňatku.')

  // --- Layer 3 (§4.5): rules with structured conditions --------------------
  const [leaderRule] = await unscopedDb
    .insert(rules)
    .values({
      runId: RUN_ID,
      externalId: 'R_Marie_VedeniSmeny',
      chapterId: chapter1.id,
      name: 'Kdo vede směnu, vede i Srdce party',
      description:
        'Postava, která se stala vedoucím směny, přebírá vedení Srdce party. Kdo to je, určuje odpověď.',
      priority: 100,
      weight: '1',
      sourceConfigVersionId: configVersionId,
    })
    .returning()
  if (!leaderRule) throw new Error('Nepodařilo se založit pravidlo o vedení.')

  await unscopedDb.insert(ruleConditions).values({
    runId: RUN_ID,
    ruleId: leaderRule.id,
    groupIndex: 0,
    position: 1,
    connector: 'AND',
    subject: 'odpoved',
    operator: 'eq',
    questionId: leaderQuestion.id,
    answerOptionId: optionMarie.id,
  })

  // Target derived from the answer (§7.3): the leader is whoever the chosen
  // option references, not whoever answered.
  await unscopedDb.insert(effects).values({
    runId: RUN_ID,
    ruleId: leaderRule.id,
    ordinal: 1,
    kind: 'vedeni',
    groupId: srdceParty.id,
    groupRole: 'vedouci',
    relatedFromAnswer: true,
  })

  const [marriageRule] = await unscopedDb
    .insert(rules)
    .values({
      runId: RUN_ID,
      externalId: 'R_Marie_Svatba',
      chapterId: chapter1.id,
      name: 'Sňatek slučuje domácnosti',
      description:
        'Když org zadá, že se Marie provdala, sloučí se její domácnost s domácností vybraného partnera.',
      priority: 200,
      weight: '1',
      // A wedding hits the household as a whole, not each member (§4.4).
      appliesOncePerHousehold: true,
      sourceConfigVersionId: configVersionId,
    })
    .returning()
  if (!marriageRule) throw new Error('Nepodařilo se založit pravidlo o sňatku.')

  await unscopedDb.insert(ruleConditions).values({
    runId: RUN_ID,
    ruleId: marriageRule.id,
    groupIndex: 0,
    position: 1,
    connector: 'AND',
    subject: 'odpoved',
    operator: 'eq',
    questionId: marriageQuestion.id,
    answerOptionId: optionMirekSvatba.id,
  })

  await unscopedDb.insert(effects).values([
    {
      runId: RUN_ID,
      ruleId: marriageRule.id,
      ordinal: 1,
      kind: 'domacnost_slouceni',
      characterId: marie.id,
      // The partner comes from the answer, so no rule per pair of 23 characters.
      relatedFromAnswer: true,
    },
    {
      runId: RUN_ID,
      ruleId: marriageRule.id,
      ordinal: 2,
      kind: 'priznak',
      characterId: marie.id,
      flagId: flagIdByKey.get('Svatba')!,
      flagValue: true,
    },
    {
      runId: RUN_ID,
      ruleId: marriageRule.id,
      ordinal: 3,
      kind: 'priznak',
      characterId: marie.id,
      flagId: flagIdByKey.get('Spolecny_ucet')!,
      flagValue: true,
    },
    {
      runId: RUN_ID,
      ruleId: marriageRule.id,
      ordinal: 4,
      kind: 'blok',
      characterId: marie.id,
      blockExternalId: 'MARIE_SVATBA',
    },
  ])

  await unscopedDb.insert(auditLog).values({
    runId: RUN_ID,
    action: 'konfigurace.import',
    entityKind: 'config_versions',
    entityId: configVersionId,
    summary: 'Seed: založen ukázkový běh s verzí konfigurace 1.',
    author: AUTHOR,
  })

  const [counts] = await unscopedDb
    .select({
      postavy: sql<number>`(select count(*) from characters where run_id = ${RUN_ID})`,
      domacnosti: sql<number>`(select count(*) from households where run_id = ${RUN_ID})`,
      skalyPostavy: sql<number>`(select count(*) from scales where run_id = ${RUN_ID} and scope = 'postava')`,
      skalySdilene: sql<number>`(select count(*) from scales where run_id = ${RUN_ID} and scope = 'domacnost')`,
      otazkyHrac: sql<number>`(select count(*) from questions where run_id = ${RUN_ID} and source = 'hrac')`,
      otazkyOrg: sql<number>`(select count(*) from questions where run_id = ${RUN_ID} and source = 'org')`,
      pravidla: sql<number>`(select count(*) from rules where run_id = ${RUN_ID})`,
    })
    .from(runs)
    .where(eq(runs.id, RUN_ID))

  process.stdout.write(
    `Seed hotový: běh ${RUN_ID}\n` +
      `  ${counts?.postavy} postav, ${counts?.domacnosti} domácností\n` +
      `  škály: ${counts?.skalyPostavy} za postavu, ${counts?.skalySdilene} sdílené\n` +
      `  otázky: ${counts?.otazkyHrac} pro hráče, ${counts?.otazkyOrg} pro orga\n` +
      `  pravidla: ${counts?.pravidla}\n`,
  )
  await rawSql.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
