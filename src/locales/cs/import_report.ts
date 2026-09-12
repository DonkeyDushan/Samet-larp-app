/** The report shown after checking or importing a config (§10.2). */
import type { EntityKind } from '@/import'

export const importReport = Object.freeze({
  usable: '— konfigurace je použitelná',
  unusable: '— konfigurace se nedá použít, dokud se chyby neopraví',
  alreadyImported: (version: number) => `Tenhle soubor už je naimportovaný jako verze ${version}. Nic se nezdvojilo.`,
  saved: (version: number) => `Uloženo jako verze ${version}. Běh z ní začne počítat, až ji aktivuješ.`,

  chapters: 'Kapitoly',
  characters: 'Postavy',
  questions: 'Otázky',
  answers: 'Odpovědi',
  blocks: 'Bloky',
  variations: 'Varianty',

  repairsTitle: 'Co se při čtení ošetřilo',
  filledDownCells: (count: number) => `doplněno ${count} slučovaných buněk směrem dolů`,
  trimmedCells: (count: number) => `ořezáno ${count} buněk s mezerami`,
  skippedEmptyRows: (count: number) => `přeskočeno ${count} prázdných řádků`,
  resolvedCharacterNames: (count: number) => `${count}× dohledána postava podle jména místo ID`,
  droppedScaleStrategies: (count: number) => `${count}× ignorována strategie slučování u osobní škály`,
  ignoredSheets: (sheets: string[]) => `nepoužité listy: ${sheets.join(', ')}`,

  errorsTitle: (count: number) => `Chyby (${count})`,
  errorsNote: 'Blokují použití konfigurace.',
  warningsTitle: (count: number) => `Varování (${count})`,
  warningsNote: 'Konfigurace projde, ale stojí za podívání.',
  didYouMeanBefore: 'Mysleli jste ',
  didYouMeanAfter: '?',
  row: (row: number) => `řádek ${row}`,

  diffIdentical: 'Proti poslední verzi se nic nezměnilo.',
  diffTitle: 'Proti poslední verzi',
  diffCounts: (added: number, changed: number, removed: number) =>
    `${added} přibylo · ${changed} změněno · ${removed} zmizelo`,
  diffAdded: 'Přibylo',
  diffChanged: 'Změnilo se',
  diffRemoved: 'Zmizelo',
  diffGroupTitle: (title: string, count: number) => `${title} (${count})`,
  chapterSuffix: (chapter: number) => ` (kap. ${chapter})`,

  templatesTitle: 'Šablony postav',
  allTemplatesPresent: 'Každá postava má šablonu.',
  missingTemplates: (count: number) => `Chybí ${count} šablon.`,
  templateMissing: 'nenahraná',
  templateUnassigned: 'bez Template ID v tabulce',
  unmatchedTemplates: (filenames: string[]) => `Nahráno, ale nepatří žádné postavě: ${filenames.join(', ')}`,

  entityLabels: Object.freeze<Record<EntityKind, string>>({
    postava: 'postava',
    skupina: 'skupina',
    skala: 'škála',
    pasmo: 'pásmo',
    otazka: 'otázka',
    odpoved: 'odpověď',
    blok: 'blok',
    varianta: 'varianta',
  }),
})
