/**
 * Pustí ruční SQL z `db/sql/` v abecedním pořadí.
 *
 * Tady žije to, co Drizzle neumí vyjádřit ve schématu — zatím trigger, který
 * dělá z auditu opravdu append-only. Skripty musí být idempotentní, protože
 * se pouští po každé migraci.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import 'dotenv/config'
import { rawSql } from '../src/db/client'

const dir = join(process.cwd(), 'db', 'sql')

async function main() {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const contents = readFileSync(join(dir, file), 'utf8')
    process.stdout.write(`→ ${file}\n`)
    await rawSql.unsafe(contents)
  }

  process.stdout.write(`Hotovo, ${files.length} skript(ů).\n`)
  await rawSql.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
