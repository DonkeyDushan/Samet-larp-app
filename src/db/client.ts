/**
 * Připojení k databázi. Tenká vrstva: kdyby se měnil poskytovatel Postgresu
 * (Neon → něco jiného), mění se **jen tenhle soubor** (§15).
 *
 * Záměrně se neexportuje z `src/db/index.ts` — aplikační kód se k datům
 * dostává výhradně přes `forRun()`, které vyžaduje `runId`. Viz pravidlo 2.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('Chybí DATABASE_URL. Zkopíruj .env.example do .env a doplň připojení.')
  }
  return url
}

declare global {
  // eslint-disable-next-line no-var
  var __larpSql: ReturnType<typeof postgres> | undefined
}

/** V dev režimu Next.js přebíjí moduly, takže spojení držíme na globalThis. */
const sql = globalThis.__larpSql ?? postgres(connectionString(), { max: 5 })
if (process.env.NODE_ENV !== 'production') globalThis.__larpSql = sql

/**
 * Neomezené spojení bez `runId`. **Používat jen pro migrace, seed, zálohy
 * a import konfigurace do právě zakládaného běhu** — tedy tam, kde běh
 * ještě neexistuje nebo se pracuje přes všechny běhy.
 *
 * Aplikační kód (route handlery, serverové akce) ho nesmí použít; má `forRun()`.
 */
export const unscopedDb = drizzle(sql, { schema })

export type Database = typeof unscopedDb

export { sql as rawSql }
