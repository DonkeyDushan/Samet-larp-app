/**
 * Seed s ukázkovými daty — jeden běh, jedna postava, jedna skupina, tři škály.
 *
 * Účel je mít v databázi tvar, na kterém jde vidět, jak do sebe tabulky
 * zapadají, a rozjet obrazovky, až přijdou. **Není to konfigurace hry** — ta
 * se v ostrém provozu importuje z `.xlsx` (§10.2).
 *
 * Spouští se opakovaně: nejdřív smaže běh `2026-09-12_A`, pokud existuje.
 * Je to jediné místo v celém projektu, které maže data, a smí to jen proto,
 * že jde o seedovací běh v lokální databázi.
 */
import 'dotenv/config'
import { eq, sql } from 'drizzle-orm'
import { unscopedDb, rawSql } from '../src/db/client'
import type { RunScopedTable } from '../src/db/run-scope'
import {
  answerOptions,
  auditLog,
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
  questions,
  ruleConditions,
  rules,
  scaleBands,
  scales,
  runs,
} from '../src/db/schema'

const RUN_ID = '2026-09-12_A'
const AUTHOR = 'seed skript'

/** Výchozí rozdělení pásem 1–3 / 4–5 / 6–8 / 9–10 (§4.1). Názvy jsou per škála. */
const BAND_BOUNDS = [
  { ordinal: 1, minValue: 1, maxValue: 3 },
  { ordinal: 2, minValue: 4, maxValue: 5 },
  { ordinal: 3, minValue: 6, maxValue: 8 },
  { ordinal: 4, minValue: 9, maxValue: 10 },
] as const

const SCALE_SEED = [
  {
    key: 'Wealth',
    label: 'Majetek',
    description: 'Kolik má postava na spořáku a čím disponuje.',
    bandNames: ['Na dně', 'Vyžije', 'Zajištěná', 'Zazobaná'],
  },
  {
    key: 'Regime',
    label: 'Přesvědčení o režimu',
    description: 'Jak se postava staví ke komunistickému režimu.',
    bandNames: ['Otevřeně proti', 'Skeptička', 'Loajální', 'Přesvědčená'],
  },
  {
    key: 'Control',
    label: 'Kontrola nad organizací',
    description: 'Jak velký vliv má postava ve své skupině.',
    bandNames: ['Bez vlivu', 'Slyší ji', 'Rozhoduje', 'Drží to v ruce'],
  },
] as const

async function wipeSeedRun() {
  // Mazat v pořadí od závislých k nadřazeným — cizí klíče jsou `restrict`.
  const order: RunScopedTable[] = [
    auditLog,
    characterVariables,
    characterScaleValues,
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

  // Všechny tři kapitoly vznikají hned se založením běhu, aby na ně mohla
  // konfigurace navázat otázky (§3.2).
  const chapterRows = await unscopedDb
    .insert(chapters)
    .values([1, 2, 3].map((number) => ({ runId: RUN_ID, number, status: 'rozpracovana' as const })))
    .returning()
  const chapterByNumber = new Map(chapterRows.map((row) => [row.number, row]))
  const chapter1 = chapterByNumber.get(1)
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

  const [marie, karel] = await unscopedDb
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
    ])
    .returning()
  if (!marie || !karel) throw new Error('Nepodařilo se založit postavy.')

  // Škály a jejich pásma. Prahy i názvy jsou v datech, nikdy v kódu (§4.1).
  const scaleIdByKey = new Map<string, string>()
  const bandIdByScaleAndOrdinal = new Map<string, string>()
  for (const definition of SCALE_SEED) {
    const [scale] = await unscopedDb
      .insert(scales)
      .values({
        runId: RUN_ID,
        key: definition.key,
        label: definition.label,
        description: definition.description,
        sourceConfigVersionId: configVersionId,
      })
      .returning()
    if (!scale) throw new Error(`Nepodařilo se založit škálu ${definition.key}.`)
    scaleIdByKey.set(definition.key, scale.id)

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

  await unscopedDb.insert(flags).values([
    {
      runId: RUN_ID,
      key: 'Svatba',
      label: 'Svatba',
      description: 'Postava se v průběhu kapitoly vdala nebo oženila.',
      sourceConfigVersionId: configVersionId,
    },
    {
      runId: RUN_ID,
      key: 'Firemni_byt',
      label: 'Firemní byt',
      description: 'Postava získala přidělený byt od organizace.',
      sourceConfigVersionId: configVersionId,
    },
  ])

  /** Počáteční hodnoty škál Marie pro kapitolu 1 (list `Characters`, §4.2). */
  const marieInitial: Record<string, number> = { Wealth: 4, Regime: 6, Control: 3 }

  for (const [key, initialValue] of Object.entries(marieInitial)) {
    const scaleId = scaleIdByKey.get(key)!
    await unscopedDb.insert(characterScales).values({
      runId: RUN_ID,
      characterId: marie.id,
      scaleId,
      externalId: `S_Marie_${key}`,
      initialValue,
      sourceConfigVersionId: configVersionId,
    })

    // Počáteční stav je snapshot kapitoly 1 bez vazby na přepočet.
    await unscopedDb.insert(characterScaleValues).values({
      runId: RUN_ID,
      chapterId: chapter1.id,
      characterId: marie.id,
      scaleId,
      value: initialValue,
      source: 'pocatecni',
      bandId: bandIdByScaleAndOrdinal.get(
        `${scaleId}:${BAND_BOUNDS.find((b) => initialValue >= b.minValue && initialValue <= b.maxValue)!.ordinal}`,
      ),
    })
  }

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

  // Otázka je vždy navázaná na konkrétní postavu (§6.6).
  const [question] = await unscopedDb
    .insert(questions)
    .values({
      runId: RUN_ID,
      externalId: 'Q_Marie1_1',
      chapterId: chapter1.id,
      characterId: marie.id,
      ordinal: 1,
      type: 'single',
      text: 'Kdo ze party se stal vedoucím směny?',
      sourceConfigVersionId: configVersionId,
    })
    .returning()
  if (!question) throw new Error('Nepodařilo se založit otázku.')

  // Volba jmenující jinou postavu odkazuje na její ID, ne na volný text (§6.6).
  const [optionKarel, optionMarie] = await unscopedDb
    .insert(answerOptions)
    .values([
      {
        runId: RUN_ID,
        externalId: 'A_Marie_1_1_Karel',
        questionId: question.id,
        ordinal: 1,
        label: 'Karel',
        referencedCharacterId: karel.id,
      },
      {
        runId: RUN_ID,
        externalId: 'A_Marie_1_1_Marie',
        questionId: question.id,
        ordinal: 2,
        label: 'Marie',
        referencedCharacterId: marie.id,
      },
    ])
    .returning()
  if (!optionKarel || !optionMarie) throw new Error('Nepodařilo se založit volby odpovědi.')

  // Dopad volby na škály: `S_Marie_Wealth+3, S_Marie_Regime-2` (§4.2).
  await unscopedDb.insert(effects).values([
    {
      runId: RUN_ID,
      answerOptionId: optionKarel.id,
      ordinal: 1,
      kind: 'zmena_skaly',
      characterId: marie.id,
      scaleId: scaleIdByKey.get('Wealth')!,
      scaleDelta: 3,
    },
    {
      runId: RUN_ID,
      answerOptionId: optionKarel.id,
      ordinal: 2,
      kind: 'zmena_skaly',
      characterId: marie.id,
      scaleId: scaleIdByKey.get('Regime')!,
      scaleDelta: -2,
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
  ])

  // Ukázka pravidla se strukturovanou podmínkou — žádný textový výraz (§15).
  const [rule] = await unscopedDb
    .insert(rules)
    .values({
      runId: RUN_ID,
      externalId: 'R_Marie_VedeniSmeny',
      chapterId: chapter1.id,
      name: 'Marie vede směnu, roste jí vliv',
      description:
        'Když Marie odpověděla, že vedoucím směny se stala ona, získává vliv ve Srdci party.',
      priority: 100,
      weight: '1',
      sourceConfigVersionId: configVersionId,
    })
    .returning()
  if (!rule) throw new Error('Nepodařilo se založit pravidlo.')

  await unscopedDb.insert(ruleConditions).values({
    runId: RUN_ID,
    ruleId: rule.id,
    groupIndex: 0,
    position: 1,
    connector: 'AND',
    subject: 'odpoved',
    operator: 'eq',
    questionId: question.id,
    answerOptionId: optionMarie.id,
  })

  await unscopedDb.insert(effects).values([
    {
      runId: RUN_ID,
      ruleId: rule.id,
      ordinal: 1,
      kind: 'vedeni',
      characterId: marie.id,
      groupId: srdceParty.id,
      groupRole: 'vedouci',
    },
    {
      runId: RUN_ID,
      ruleId: rule.id,
      ordinal: 2,
      kind: 'blok',
      characterId: marie.id,
      blockExternalId: 'MARIE_VEDENI_SMENY',
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
      skaly: sql<number>`(select count(*) from scales where run_id = ${RUN_ID})`,
      pasma: sql<number>`(select count(*) from scale_bands where run_id = ${RUN_ID})`,
      otazky: sql<number>`(select count(*) from questions where run_id = ${RUN_ID})`,
    })
    .from(runs)
    .where(eq(runs.id, RUN_ID))

  process.stdout.write(
    `Seed hotový: běh ${RUN_ID}, ${counts?.postavy} postav, ${counts?.skaly} škál, ` +
      `${counts?.pasma} pásem, ${counts?.otazky} otázka/y.\n`,
  )
  await rawSql.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
