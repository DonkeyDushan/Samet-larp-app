type LabelList = { listed: string[]; total: number }

const joinLabels = ({ listed, total }: LabelList): string =>
  total > listed.length ? `${listed.join(', ')} a dalších ${total - listed.length}` : listed.join(', ')

/** Failures reported to the org outside of import validation. */
export const errors = Object.freeze({
  noConfigFile: 'Nevybral se žádný soubor s konfigurací.',
  unreadableFile: (detail: string) => `Soubor se nepodařilo přečíst: ${detail}`,
  authorRequiredForImport: 'Vyplň „Kdo jsi?" — každá změna se zapisuje do auditu se jménem.',
  databaseUnavailable: (detail: string) =>
    `Databáze zatím neodpovídá (${detail}). Kontrola souboru bez ukládání funguje i tak — ukládání a archiv nahraných souborů potřebují databázi.`,

  configHasErrors: 'Konfigurace obsahuje chyby a nedá se uložit. Oprav je v tabulce a nahraj soubor znovu.',
  archiveFailed: 'Nahraný soubor se nepodařilo uložit do archivu běhu.',
  reasonRequiredWhenFrozen: 'Běh už má přepočet, konfigurace je zmrazená. Nouzová oprava potřebuje důvod.',
  removalWhenFrozen: (labels: LabelList) =>
    `Běh už má přepočet, takže z konfigurace nejde nic odebrat. Nový soubor neobsahuje: ${joinLabels(labels)}. Vrať je do tabulky a nahraj soubor znovu.`,
  staleRowsInUse: (labels: LabelList) =>
    `Nový soubor neobsahuje ${joinLabels(labels)}, ale v běhu na ně už navazují data (třeba zadané odpovědi). Vrať je do tabulky, nebo nejdřív odeber navázaná data.`,
})
