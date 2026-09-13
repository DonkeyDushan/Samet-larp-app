type LabelList = { listed: string[]; total: number }

const joinLabels = ({ listed, total }: LabelList): string =>
  total > listed.length ? `${listed.join(', ')} a dalších ${total - listed.length}` : listed.join(', ')

/** Failures reported to the org outside of import validation. */
export const errors = Object.freeze({
  passwordNotConfigured: 'Aplikace nemá nastavené heslo (APP_PASSWORD), přihlášení je proto vypnuté.',
  wrongPassword: 'Heslo nesedí.',
  authorInvalid: 'Vyplň „Kdo jsi?" — krátké jméno, pod kterým se změny zapisují do auditu.',

  invalidStartDate: 'Datum zahájení musí být platné datum.',
  labelTooLong: (max: number) => `Popisný název může mít nejvýš ${max} znaků.`,
  noFreeRunLetter: 'Pro tohle datum už není volné písmeno běhu.',
  runNotFound: (runId: string) => `Běh ${runId} neexistuje.`,

  somethingFailed: 'Něco se nepovedlo.',
  noConfigFile: 'Nevybral se žádný soubor s konfigurací.',
  unreadableFile: (detail: string) => `Soubor se nepodařilo přečíst: ${detail}`,
  authorRequiredForImport: 'Chybí jméno z „Kdo jsi?" — přihlas se znovu, každá změna se zapisuje do auditu se jménem.',

  configHasErrors: 'Konfigurace obsahuje chyby a nedá se uložit. Oprav je v tabulce a nahraj soubor znovu.',
  archiveFailed: 'Nahraný soubor se nepodařilo uložit do archivu běhu.',
  reasonRequiredWhenFrozen: 'Běh už má přepočet, konfigurace je zmrazená. Nouzová oprava potřebuje důvod.',
  removalWhenFrozen: (labels: LabelList) =>
    `Běh už má přepočet, takže z konfigurace nejde nic odebrat. Nový soubor neobsahuje: ${joinLabels(labels)}. Vrať je do tabulky a nahraj soubor znovu.`,
  staleRowsInUse: (labels: LabelList) =>
    `Nový soubor neobsahuje ${joinLabels(labels)}, ale v běhu na ně už navazují data (třeba zadané odpovědi). Vrať je do tabulky, nebo nejdřív odeber navázaná data.`,
})
