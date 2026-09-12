/** The report shown after checking or importing a config (§10.2). */
export const importReport = Object.freeze({
  usable: '— konfigurace je použitelná',
  unusable: '— konfigurace se nedá použít, dokud se chyby neopraví',
  saved: 'Uloženo. Běh počítá z téhle konfigurace a nahrané soubory jsou v archivu.',
  removed: (count: number) => `Odebráno ${count} záznamů, které nový soubor už neobsahuje.`,
  touchedChapters: (chapters: number[]) =>
    `Nouzová oprava označila kapitoly ${chapters.join(', ')} jako dotčené. Nic se nepřepočítalo — rozhodni, co s nimi.`,

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

  templatesTitle: 'Šablony postav',
  allTemplatesPresent: 'Každá postava má šablonu.',
  missingTemplates: (count: number) => `Chybí ${count} šablon.`,
  templateMissing: 'nenahraná',
  templateUnassigned: 'bez Template ID v tabulce',
  unmatchedTemplates: (filenames: string[]) => `Nahráno, ale nepatří žádné postavě: ${filenames.join(', ')}`,
})
