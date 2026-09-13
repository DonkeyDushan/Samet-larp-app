import type { chapterStatus, runStatus } from '@/db/schema'

/** Display labels of the domain states stored without diacritics (§13). */
export const statuses = Object.freeze({
  run: Object.freeze({
    zalozen: 'založen',
    aktivni: 'aktivní',
    archivovan: 'archivován',
  } satisfies Record<(typeof runStatus.enumValues)[number], string>),
  chapter: Object.freeze({
    rozpracovana: 'rozpracovaná',
    spocitana: 'spočítaná',
    vydana: 'vydaná',
  } satisfies Record<(typeof chapterStatus.enumValues)[number], string>),

})
