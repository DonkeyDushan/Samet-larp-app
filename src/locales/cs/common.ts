/** Strings shared across screens. */
export const common = Object.freeze({
  appTitle: 'Sametový LARP — engine',
  appDescription: 'Interní nástroj organizátorů pro zpracování dotazníků mezi kapitolami.',
  placeholderBody: 'Zatím stojí datové schéma a typy enginu. Rozhraní přijde po enginu pravidel.',
  run: 'Běh',
  switchRun: 'Přepnout',
  noRun: 'Žádný běh',
  authorLabel: 'Kdo jsi?',
  authorPlaceholder: 'Natálie',
  emptyValue: '—',
  runOption: (id: string, label: string | null) => (label ? `${id} — ${label}` : id),
})
