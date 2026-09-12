/** Audit summaries — written once, read after the game. */
export const audit = Object.freeze({
  configImport: (filename: string, removedCount: number) =>
    removedCount > 0
      ? `Import konfigurace ze souboru ${filename}; odebráno ${removedCount} záznamů, které soubor už neobsahuje.`
      : `Import konfigurace ze souboru ${filename}.`,
  configEmergencyFix: (filename: string, touchedChapters: number[]) =>
    `Nouzová oprava konfigurace ze souboru ${filename}; dotčené kapitoly: ${touchedChapters.join(', ')}.`,
})
