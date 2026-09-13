/** Run list and creation (§3.2). */
export const runsText = Object.freeze({
  title: 'Běhy',
  intro: 'Každý běh má vlastní data, konfiguraci i barvu rozhraní. Pracuj vždy v tom, jehož papíry držíš.',
  empty: 'Zatím není založený žádný běh.',

  columnId: 'Běh',
  columnLabel: 'Popisný název',
  columnStartDate: 'Zahájení',
  columnStatus: 'Stav',
  open: 'Otevřít',
  rename: 'Přejmenovat',

  createTitle: 'Založit běh',
  createIntro: 'ID se vygeneruje z data zahájení a dalšího volného písmena. Konfiguraci nahraješ hned potom ve Správě.',
  startDateLabel: 'Datum zahájení',
  labelLabel: 'Popisný název (nepovinný)',
  labelPlaceholder: 'Podzimní běh, sobotní parta',
  idPreviewBefore: 'Vznikne běh ',
  idPreviewUnavailable: 'Pro tohle datum není volné písmeno.',
  create: 'Založit běh',
  creating: 'Zakládám…',

  renameTitle: (runId: string) => `Popisný název běhu ${runId}`,
  renameIntro: 'ID běhu zůstává, mění se jen popisný název. Změna jde do auditu.',
})
