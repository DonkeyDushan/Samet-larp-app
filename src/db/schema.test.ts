/**
 * Tests an architecture rule, not a function.
 *
 * Rule 2 requires `run_id` in every table. Checking it mechanically over the
 * whole schema means a new table without it fails here, not during the game
 * when two runs' data meet.
 */
import { readFileSync } from 'node:fs'
import { getTableColumns, getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import * as schema from './schema'

/** `runs` is the table `run_id` points at. */
const WITHOUT_RUN_ID = new Set(['runs'])

// `schema` exports enums as well as tables; `unknown[]` keeps the `is`
// predicate out of their union type.
const tables = (Object.values(schema) as unknown[])
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
