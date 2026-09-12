/**
 * Runs the hand-written SQL in `db/sql/` in alphabetical order.
 *
 * That directory holds what Drizzle cannot express in the schema. The scripts
 * must be idempotent — they run after every migration.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import 'dotenv/config'
import { rawSql } from '../src/db/client'

const dir = join(process.cwd(), 'db', 'sql')

const main = async () => {
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
