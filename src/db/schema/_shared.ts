/**
 * Společné konvence schématu.
 *
 * Pravidlo 2 (run_id v každé tabulce): každá tabulka s herními daty nese `run_id`
 * a každý odkaz uvnitř běhu je **složený cizí klíč** `(run_id, <id>)`. Díky tomu
 * databáze sama odmítne odpověď z běhu A navázanou na otázku z běhu B — izolace
 * drží strukturou, ne kázní při psaní dotazů.
 *
 * Pravidlo 3 (nic se nemaže): všechny cizí klíče jsou `onDelete: 'restrict'`.
 * Archivovaný běh zůstává navždy prohlížitelný (§3.2).
 *
 * Názvy tabulek a sloupců jsou anglicky (konvence kódu), hodnoty doménových
 * stavů česky bez diakritiky (§13 — jazyk dat je čeština, ale v SQL literálech
 * se diakritice vyhýbáme).
 */
import { timestamp, text } from 'drizzle-orm/pg-core'

/** Časová značka vzniku záznamu. */
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()

/**
 * Kdo akci provedl — volný text z pole „Kdo jsi?" (§3.1).
 * Bez ověřování; jediný zdroj identity v celé aplikaci.
 *
 * Název sloupce se předává, protože každá tabulka pojmenovává autora podle
 * toho, co udělal: `created_by`, `answered_by`, `rolled_by`, `author`.
 */
export const authorName = (column: string) => text(column).notNull()
