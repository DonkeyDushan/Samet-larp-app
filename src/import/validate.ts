/**
 * Consistency checks over a parsed config (§11).
 *
 * Errors block the config from being used; warnings let it through. Nothing
 * here throws: the point is to hand the author the whole list at once.
 *
 * Every message names the sheet, row, column and value, because the author
 * fixes the problem in the spreadsheet and has to find the row again.
 */
import { accountCounterpart } from './scale-impact'
import { IssueCollector, suggestClosest } from './issues'
import { DEFAULT_CONDITION } from './expression'
import { KNOWN_VARIABLES } from './template'
import type { ParsedConfig, ParsedScale, ParsedTemplate } from './types'

export interface ValidationInput {
  config: ParsedConfig
  /** Templates uploaded so far; validating without them skips the marker checks. */
  templates?: ParsedTemplate[]
}

export function validateConfig(input: ValidationInput, issues: IssueCollector): void {
  const { config, templates } = input

  const characterIds = new Set(config.characters.map((c) => c.externalId))
  const groupNames = new Set(config.groups.map((g) => g.name))

  checkCharacters(config, issues)
  checkScales(config, characterIds, issues)
  checkQuestions(config, characterIds, groupNames, issues)
  checkContent(config, characterIds, issues)
  checkAccountPairs(config, issues)
  checkUntouchedScales(config, issues)
  if (templates) checkTemplates(config, templates, issues)
}

function checkCharacters(config: ParsedConfig, issues: IssueCollector): void {
  for (const character of config.characters) {
    if (character.templateExternalId === '') {
      issues.error(
        'postava_bez_sablony',
        character.location,
        `Postava \`${character.externalId}\` nemá ve sloupci \`Template ID\` přiřazenou šablonu dokumentu.`,
        { value: character.externalId },
      )
    }
    if (character.firstName === '') {
      issues.warn(
        'chybejici_hodnota',
        character.location,
        `Postava \`${character.externalId}\` nemá jméno — v dokumentech se \`{JMENO}\` rozvine naprázdno.`,
      )
    }
  }

  // Chapter 1 starting values are checked against that chapter's scale bounds.
  const firstChapterScales = config.scales.get(1) ?? []
  const boundsByKey = new Map(firstChapterScales.map((s) => [s.key, s]))
  const knownKeys = [...boundsByKey.keys()]

  for (const character of config.characters) {
    for (const [key, entry] of Object.entries(character.initialScales)) {
      const scale = boundsByKey.get(key)
      if (!scale) {
        if (firstChapterScales.length === 0) continue
        issues.error(
          'neznama_skala',
          entry.location,
          `Sloupec \`S_${key}\` v listu \`Characters\` odkazuje na škálu \`${key}\`, která není definovaná v listu \`1_Scales\`.`,
          { value: key, suggestion: suggestClosest(key, knownKeys) },
        )
        continue
      }
      if (entry.value < scale.min || entry.value > scale.max) {
        issues.error(
          'hodnota_mimo_rozsah',
          entry.location,
          `Počáteční hodnota ${entry.value} škály \`${key}\` u postavy \`${character.externalId}\` je mimo rozsah ${scale.min}–${scale.max}.`,
          { value: String(entry.value) },
        )
      }
    }
  }
}

function checkScales(
  config: ParsedConfig,
  characterIds: Set<string>,
  issues: IssueCollector,
): void {
  const mergeValues = new Set(['soucet', 'prumer', 'vyssi', 'otazka'])
  const splitValues = new Set(['kopie', 'polovina', 'otazka', 'kazdy_si_odnasi'])

  for (const [chapter, scales] of config.scales) {
    for (const scale of scales) {
      if (scale.scope === 'domacnost') {
        // §4.4: a shared scale without both strategies cannot survive a
        // marriage or a divorce, and the engine must never invent one.
        if (!scale.mergeStrategy || !scale.splitStrategy) {
          const missing = [
            scale.mergeStrategy ? undefined : '`Slouceni`',
            scale.splitStrategy ? undefined : '`Rozdeleni`',
          ]
            .filter(Boolean)
            .join(' a ')
          issues.error(
            'domacnostni_skala_bez_strategie',
            scale.location,
            `Domácnostní škála \`${scale.key}\` (kapitola ${chapter}) nemá vyplněno ${missing} — bez strategie se nedá sloučit při sňatku ani rozdělit při rozvodu.`,
            { value: scale.key },
          )
        }
      }

      if (scale.mergeStrategy && !mergeValues.has(scale.mergeStrategy)) {
        issues.error(
          'chybejici_hodnota',
          scale.location,
          `Škála \`${scale.key}\` má neznámou strategii sloučení „${scale.mergeStrategy}" — čeká se ${[...mergeValues].join(', ')}.`,
          { value: scale.mergeStrategy },
        )
      }
      if (scale.splitStrategy && !splitValues.has(scale.splitStrategy)) {
        issues.error(
          'chybejici_hodnota',
          scale.location,
          `Škála \`${scale.key}\` má neznámou strategii rozdělení „${scale.splitStrategy}" — čeká se ${[...splitValues].join(', ')}.`,
          { value: scale.splitStrategy },
        )
      }

      checkBands(scale, chapter, issues)
    }
  }
  void characterIds
}

function checkBands(scale: ParsedScale, chapter: number, issues: IssueCollector): void {
  const sorted = [...scale.bands].sort((a, b) => a.min - b.min)
  for (let i = 0; i < sorted.length; i++) {
    const band = sorted[i]!
    if (band.min < scale.min || band.max > scale.max) {
      issues.error(
        'hodnota_mimo_rozsah',
        scale.location,
        `Pásmo ${band.min}–${band.max} škály \`${scale.key}\` (kapitola ${chapter}) přesahuje rozsah škály ${scale.min}–${scale.max}.`,
        { value: `${band.min}-${band.max}` },
      )
    }
    const next = sorted[i + 1]
    if (next && next.min <= band.max) {
      issues.error(
        'hodnota_mimo_rozsah',
        scale.location,
        `Pásma škály \`${scale.key}\` se překrývají: ${band.min}–${band.max} a ${next.min}–${next.max}.`,
        { value: scale.key },
      )
    }
    if (next && next.min > band.max + 1) {
      issues.warn(
        'hodnota_mimo_rozsah',
        scale.location,
        `Mezi pásmy škály \`${scale.key}\` je díra: hodnoty ${band.max + 1}–${next.min - 1} nepatří do žádného pásma.`,
        { value: scale.key },
      )
    }
  }
}

function checkQuestions(
  config: ParsedConfig,
  characterIds: Set<string>,
  groupNames: Set<string>,
  issues: IssueCollector,
): void {
  const knownCharacters = [...characterIds]

  for (const [chapter, questions] of config.questions) {
    const scaleKeys = new Set((config.scales.get(chapter) ?? []).map((s) => s.key))
    const blockIds = new Set((config.blocks.get(chapter) ?? []).map((b) => b.externalId))
    const knownScaleIds = [...characterIds].flatMap((c) => [...scaleKeys].map((s) => `S_${c}_${s}`))
    const knownBlockIds = [...blockIds]

    for (const question of questions) {
      if (question.characterId === undefined) {
        issues.error(
          'neznama_postava',
          question.location,
          `Otázka \`${question.externalId}\` je vedená na postavu \`${question.characterRef}\`, která není v listu \`Characters\`.`,
          {
            value: question.characterRef,
            suggestion: suggestClosest(question.characterRef, knownCharacters),
          },
        )
      }

      for (const option of question.options) {
        for (const impact of option.impacts) {
          if (!characterIds.has(impact.character)) {
            issues.error(
              'neznama_postava',
              option.location,
              `Dopad \`${impact.raw}\` u odpovědi \`${option.externalId}\` míří na postavu \`${impact.character}\`, která není v listu \`Characters\`.`,
              {
                value: impact.character,
                suggestion: suggestClosest(impact.character, knownCharacters),
              },
            )
          }
          if (!scaleKeys.has(impact.scale)) {
            issues.error(
              'neznama_skala',
              option.location,
              `Škála \`${impact.externalId}\` neexistuje — v listu \`${chapter}_Scales\` není škála \`${impact.scale}\`.`,
              {
                value: impact.externalId,
                suggestion: suggestClosest(impact.externalId, knownScaleIds),
              },
            )
          }
        }

        for (const blockId of option.blocks) {
          if (!blockIds.has(blockId)) {
            issues.error(
              'neznamy_blok',
              option.location,
              `Odpověď \`${option.externalId}\` zapíná blok \`${blockId}\`, který není v listu \`${chapter}_Content\`.`,
              { value: blockId, suggestion: suggestClosest(blockId, knownBlockIds) },
            )
          }
        }

        for (const effect of option.effects) {
          const expectsCharacter = effect.name === 'SNATEK' || effect.name === 'ROZVOD'
          if (expectsCharacter && !characterIds.has(effect.argument)) {
            issues.error(
              'neznama_postava',
              option.location,
              `Efekt \`${effect.raw}\` u odpovědi \`${option.externalId}\` odkazuje na postavu \`${effect.argument}\`, která není v listu \`Characters\`.`,
              {
                value: effect.argument,
                suggestion: suggestClosest(effect.argument, knownCharacters),
              },
            )
          }
          const expectsGroup = effect.name === 'VEDENI' || effect.name === 'CLENSTVI'
          if (expectsGroup && !groupNames.has(effect.argument)) {
            issues.error(
              'neznama_skupina',
              option.location,
              `Efekt \`${effect.raw}\` u odpovědi \`${option.externalId}\` odkazuje na skupinu \`${effect.argument}\`, která u žádné postavy v listu \`Characters\` není.`,
              {
                value: effect.argument,
                suggestion: suggestClosest(effect.argument, [...groupNames]),
              },
            )
          }
        }
      }
    }
  }
}

function checkContent(
  config: ParsedConfig,
  characterIds: Set<string>,
  issues: IssueCollector,
): void {
  const knownCharacters = [...characterIds]

  for (const [chapter, blocks] of config.blocks) {
    // A character's state carries forward, so a chapter-2 condition may read a
    // chapter-1 answer or a flag an earlier chapter set — the spec's own
    // example mixes chapters in one expression (§4.5). Only later chapters are
    // out of reach.
    const earlier = [...config.questions.entries()]
      .filter(([n]) => n <= chapter)
      .flatMap(([, qs]) => qs)
    const answerIds = new Set(earlier.flatMap((q) => q.options.map((o) => o.externalId)))
    // Flags are not declared anywhere: they exist by being set (layer 2).
    const flagNames = new Set(earlier.flatMap((q) => q.options.flatMap((o) => o.flags)))
    const scaleKeys = new Set((config.scales.get(chapter) ?? []).map((s) => s.key))
    const knownScaleIds = [...characterIds].flatMap((c) => [...scaleKeys].map((s) => `S_${c}_${s}`))

    for (const block of blocks) {
      if (block.characterId === undefined) {
        issues.error(
          'neznama_postava',
          block.location,
          `Blok \`${block.externalId}\` je vedený na postavu \`${block.characterRef}\`, která není v listu \`Characters\`.`,
          {
            value: block.characterRef,
            suggestion: suggestClosest(block.characterRef, knownCharacters),
          },
        )
      }

      const byPriority = new Map<number, string[]>()
      let hasDefault = false

      for (const variation of block.variations) {
        const sharing = byPriority.get(variation.priority) ?? []
        sharing.push(variation.externalId)
        byPriority.set(variation.priority, sharing)

        if (variation.condition.isDefault) hasDefault = true

        for (const reference of variation.condition.references) {
          switch (reference.kind) {
            case 'odpoved':
              if (!answerIds.has(reference.name)) {
                issues.error(
                  'neznama_odpoved',
                  variation.location,
                  `Podmínka varianty \`${variation.externalId}\` odkazuje na odpověď \`${reference.name}\`, která neexistuje v kapitole ${chapter} ani v žádné dřívější.`,
                  { value: reference.name, suggestion: suggestClosest(reference.name, [...answerIds]) },
                )
              }
              break
            case 'skala':
              if (!knownScaleIds.includes(reference.name)) {
                issues.error(
                  'neznama_skala',
                  variation.location,
                  `Podmínka varianty \`${variation.externalId}\` odkazuje na škálu \`${reference.name}\`, která neexistuje.`,
                  { value: reference.name, suggestion: suggestClosest(reference.name, knownScaleIds) },
                )
              }
              break
            case 'priznak':
              if (!flagNames.has(reference.name)) {
                issues.warn(
                  'neznamy_priznak',
                  variation.location,
                  `Podmínka varianty \`${variation.externalId}\` čeká příznak \`${reference.name}\`, který nenastavuje žádná odpověď v kapitole ${chapter} ani dřív — podmínka nemůže nikdy platit.`,
                  { value: reference.name, suggestion: suggestClosest(reference.name, [...flagNames]) },
                )
              }
              break
            default:
              issues.error(
                'vadny_vyraz',
                variation.location,
                `Podmínka varianty \`${variation.externalId}\` odkazuje na \`${reference.name}\`, což není ani odpověď (\`A_\`), ani škála (\`S_\`), ani příznak (\`F_\`).`,
                { value: reference.name },
              )
          }
        }
      }

      for (const [priority, sharing] of byPriority) {
        if (sharing.length > 1) {
          issues.error(
            'stejna_priorita',
            block.location,
            `Varianty ${sharing.map((v) => `\`${v}\``).join(', ')} bloku \`${block.externalId}\` mají stejnou prioritu ${priority} — výsledek by závisel na pořadí řádků.`,
            { value: String(priority) },
          )
        }
      }

      if (!hasDefault) {
        issues.error(
          'blok_bez_default',
          block.location,
          `Blok \`${block.externalId}\` nemá variantu s podmínkou \`${DEFAULT_CONDITION}\` — když neprojde žádná podmínka, značka v dokumentu nevrátí nic.`,
          { value: block.externalId },
        )
      }

      // A variant that stands after the DEFAULT can never be reached, because
      // DEFAULT is always true and variants are walked by ascending priority.
      const defaultPriority = block.variations.find((v) => v.condition.isDefault)?.priority
      if (defaultPriority !== undefined) {
        for (const variation of block.variations) {
          if (variation.priority > defaultPriority) {
            issues.warn(
              'nedosazitelna_varianta',
              variation.location,
              `Varianta \`${variation.externalId}\` má prioritu ${variation.priority}, ale \`DEFAULT\` stojí už na prioritě ${defaultPriority} — nikdy se nepoužije.`,
              { value: variation.externalId },
            )
          }
        }
      }
    }
  }
}

/**
 * §11.9: in a chapter where answers touch one half of an `_osobni` /
 * `_spolecny` pair and never the other, the missing half is almost certainly a
 * typo in a scale ID rather than a deliberate choice.
 */
function checkAccountPairs(config: ParsedConfig, issues: IssueCollector): void {
  for (const [chapter, scales] of config.scales) {
    const questions = config.questions.get(chapter) ?? []
    const touched = new Set(
      questions.flatMap((q) => q.options.flatMap((o) => o.impacts.map((i) => i.scale))),
    )

    for (const scale of scales) {
      const counterpart = accountCounterpart(scale.key)
      if (!counterpart) continue
      if (!scales.some((s) => s.key === counterpart)) continue
      if (touched.has(scale.key) && !touched.has(counterpart)) {
        issues.warn(
          'osamely_ucet',
          scale.location,
          `V kapitole ${chapter} sahá nějaká odpověď na \`${scale.key}\`, ale na protějšek \`${counterpart}\` ne — skoro jistě překlep v ID škály.`,
          { value: counterpart },
        )
      }
    }
  }
}

/** §11: a scale nothing ever moves is either dead weight or a misspelled ID. */
function checkUntouchedScales(config: ParsedConfig, issues: IssueCollector): void {
  for (const [chapter, scales] of config.scales) {
    const questions = config.questions.get(chapter) ?? []
    const blocks = config.blocks.get(chapter) ?? []
    const touched = new Set(
      questions.flatMap((q) => q.options.flatMap((o) => o.impacts.map((i) => i.scale))),
    )
    const read = new Set(
      blocks.flatMap((b) =>
        b.variations.flatMap((v) =>
          v.condition.references
            .filter((r) => r.kind === 'skala')
            .map((r) => r.name.split('_').slice(2).join('_')),
        ),
      ),
    )

    for (const scale of scales) {
      if (!touched.has(scale.key) && !read.has(scale.key)) {
        issues.warn(
          'skala_bez_dopadu',
          scale.location,
          `Se škálou \`${scale.key}\` v kapitole ${chapter} nic nehýbe a žádná podmínka ji nečte — buď je zbytečná, nebo je někde překlep v jejím ID.`,
          { value: scale.key },
        )
      }
    }
  }
}

/**
 * §8.4: a `{BLOK}` marker with no record in `N_Content` and a block in
 * `N_Content` with no marker pointing at it are both errors — in the first case
 * the marker would survive into the printed document.
 */
function checkTemplates(
  config: ParsedConfig,
  templates: ParsedTemplate[],
  issues: IssueCollector,
): void {
  const allBlocks = new Map<string, number>()
  for (const [chapter, blocks] of config.blocks) {
    for (const block of blocks) allBlocks.set(block.externalId, chapter)
  }

  const scaleKeys = new Set([...config.scales.values()].flatMap((s) => s.map((x) => x.key)))
  const markedBlocks = new Set<string>()

  for (const template of templates) {
    const location = { sheet: template.filename }

    for (const problem of template.problems) {
      issues.error(
        'vadna_znacka_sablony',
        { ...location, row: problem.line },
        `Šablona \`${template.filename}\`, řádek ${problem.line}: ${problem.detail}.`,
        { value: problem.raw },
      )
    }

    for (const blockId of template.blockIds) {
      markedBlocks.add(blockId)
      if (!allBlocks.has(blockId)) {
        issues.error(
          'znacka_bez_bloku',
          location,
          `Šablona \`${template.filename}\` obsahuje značku \`{BLOK ${blockId}}\`, ale blok \`${blockId}\` není v žádném listu \`N_Content\` — značka by zůstala v hotovém dokumentu.`,
          { value: blockId, suggestion: suggestClosest(blockId, [...allBlocks.keys()]) },
        )
      }
    }

    for (const variable of template.variables) {
      const isKnown = (KNOWN_VARIABLES as readonly string[]).includes(variable)
      // `{S_Wealth_osobni}` prints a scale value; the prefix is the author's.
      const isScale = variable.startsWith('S_') && scaleKeys.has(variable.slice(2))
      if (!isKnown && !isScale) {
        issues.error(
          'vadna_znacka_sablony',
          location,
          `Šablona \`${template.filename}\` používá proměnnou \`{${variable}}\`, kterou aplikace neumí naplnit — zůstala by v hotovém dokumentu.`,
          {
            value: variable,
            suggestion: suggestClosest(variable, [
              ...KNOWN_VARIABLES,
              ...[...scaleKeys].map((k) => `S_${k}`),
            ]),
          },
        )
      }
    }
  }

  for (const [blockId, chapter] of allBlocks) {
    if (!markedBlocks.has(blockId)) {
      issues.error(
        'blok_bez_znacky',
        { sheet: `${chapter}_Content` },
        `Blok \`${blockId}\` je v listu \`${chapter}_Content\`, ale žádná nahraná šablona na něj nemá značku \`{BLOK ${blockId}}\` — jeho text se nikam nedostane.`,
        { value: blockId },
      )
    }
  }

  const assigned = new Set(templates.map((t) => t.externalId))
  for (const character of config.characters) {
    if (character.templateExternalId !== '' && !assigned.has(character.templateExternalId)) {
      issues.error(
        'postava_bez_sablony',
        character.location,
        `Postava \`${character.externalId}\` má přiřazenou šablonu \`${character.templateExternalId}\`, ale ta nebyla nahraná.`,
        { value: character.templateExternalId },
      )
    }
  }
}
