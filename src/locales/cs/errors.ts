/** Failures reported to the org outside of import validation. */
export const errors = Object.freeze({
  noConfigFile: 'Nevybral se žádný soubor s konfigurací.',
  unreadableFile: (detail: string) => `Soubor se nepodařilo přečíst: ${detail}`,
  authorRequiredForImport: 'Vyplň „Kdo jsi?" — každá změna se zapisuje do auditu se jménem.',
  authorRequiredForActivation: 'Vyplň „Kdo jsi?" — aktivace jde do auditu.',
  databaseUnavailable: (detail: string) =>
    `Databáze zatím neodpovídá (${detail}). Kontrola souboru bez ukládání funguje i tak — ukládání a historie verzí potřebují databázi.`,
})
