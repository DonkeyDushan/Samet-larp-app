/**
 * Test architektonického pravidla, ne funkce.
 *
 * Pravidlo 2 říká, že `run_id` je v každé tabulce. Tenhle test to kontroluje
 * mechanicky nad celým schématem, takže nová tabulka bez `run_id` spadne
 * v testech a ne až na hře, kdy se data dvou běhů potkají.
 */
import { readFileSync } from 'node:fs'
import { getTableColumns, getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import * as schema from './schema'

/** `runs` je sama tou tabulkou, na kterou `run_id` odkazuje. */
const WITHOUT_RUN_ID = new Set(['runs'])

const tables = Object.values(schema)
  .filter((value): value is PgTable => is(value, PgTable))
  .map((table) => ({ name: getTableName(table), columns: getTableColumns(table) }))

describe('schéma databáze', () => {
  it('obsahuje tabulky', () => {
    expect(tables.length).toBeGreaterThan(15)
  })

  it.each(tables.filter((t) => !WITHOUT_RUN_ID.has(t.name)).map((t) => [t.name, t] as const))(
    '%s má povinné run_id (pravidlo 2)',
    (_name, table) => {
      const runId = table.columns.runId
      expect(runId, `tabulka ${table.name} nemá sloupec run_id`).toBeDefined()
      expect(runId?.notNull, `${table.name}.run_id musí být NOT NULL`).toBe(true)
    },
  )

  it('nemá tabulku, která by se jmenovala „session" (§3.2)', () => {
    for (const table of tables) {
      expect(table.name).not.toMatch(/session/i)
    }
  })

  it('audit_log je chráněný proti UPDATE a DELETE (pravidlo 3)', () => {
    const names = tables.map((t) => t.name)
    expect(names).toContain('audit_log')
    const guard = readFileSync('db/sql/001_audit_append_only.sql', 'utf8')
    expect(guard).toMatch(/audit_log/)
    expect(guard).toMatch(/before update or delete/i)
  })
})
