/**
 * Přístup k datům běhu (architektonické pravidlo 2).
 *
 * Dva běhy hry běží současně a jejich data se nesmí potkat. Izolace nedrží
 * kázní při psaní dotazů, ale **strukturou kódu**: aplikační kód nemá
 * neomezené spojení k dispozici a musí projít přes `forRun(runId)`.
 * Dotaz bez `runId` tady nejde napsat — `select()` i `insert()` si podmínku
 * na `run_id` přidávají samy a `insert()` `run_id` sám dopisuje.
 *
 * Když je potřeba dotaz, který tahle vrstva neumí (join přes víc tabulek),
 * přidej metodu **sem**, ne obcházení v aplikaci.
 */
import { and, eq, type SQL } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { unscopedDb, type Database } from './client'

/** Tabulka, kterou umí `RunScope` obsloužit: musí mít sloupec `run_id`. */
export type RunScopedTable = PgTable & { runId: PgColumn }

/**
 * Identifikátor běhu (`2026-09-12_A`). Značkovaný typ, aby se do funkcí
 * čekajících `RunId` nedal propašovat libovolný string.
 */
export type RunId = string & { readonly __brand: 'RunId' }

const RUN_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_[A-Z]$/

/** Ověří tvar identifikátoru běhu a udělá z něj `RunId`. */
export function parseRunId(value: string): RunId {
  if (!RUN_ID_PATTERN.test(value)) {
    throw new Error(`Neplatné ID běhu: ${value}. Očekává se tvar 2026-09-12_A.`)
  }
  return value as RunId
}

/** Vstupní data pro insert bez `runId` — ten dopisuje `RunScope`. */
type InsertWithoutRun<T extends RunScopedTable> = Omit<T['$inferInsert'], 'runId'>

export class RunScope {
  constructor(
    readonly runId: RunId,
    private readonly db: Database = unscopedDb,
  ) {}

  /** Podmínka `run_id = ...` pro dotazy, které se skládají ručně. */
  belongsToRun<T extends RunScopedTable>(table: T): SQL {
    return eq(table.runId, this.runId)
  }

  /** Přidá `run_id = ...` k dalším podmínkám. */
  scoped<T extends RunScopedTable>(table: T, ...conditions: (SQL | undefined)[]): SQL {
    return and(this.belongsToRun(table), ...conditions) as SQL
  }

  /** `select * from <table> where run_id = ... [and ...]` */
  select<T extends RunScopedTable>(table: T, ...conditions: (SQL | undefined)[]) {
    return this.db
      .select()
      .from(table)
      .where(this.scoped(table, ...conditions))
  }

  /** Insert s automaticky doplněným `run_id`. */
  insert<T extends RunScopedTable>(table: T, values: InsertWithoutRun<T> | InsertWithoutRun<T>[]) {
    const rows = (Array.isArray(values) ? values : [values]).map((row) => ({
      ...row,
      runId: this.runId,
    }))
    // Generický wrapper nad Drizzle: přesný typ `values()` se z generiky
    // neposkládá, hodnoty jsou ale odvozené z `$inferInsert` o řádek výš.
    return this.db.insert(table).values(rows as never)
  }

  /**
   * Update omezený na běh. Pozor: většina tabulek se z principu neupdatuje
   * (pravidlo 3 — nic se nepřepisuje destruktivně). Legitimní případy jsou
   * stav kapitoly, příznak `dotčená`, přepnutí aktivní verze konfigurace
   * a editace odpovědi (jejíž historii drží audit).
   */
  update<T extends RunScopedTable>(table: T, ...conditions: (SQL | undefined)[]) {
    return {
      set: (values: Partial<T['$inferInsert']>) =>
        this.db
          .update(table)
          .set(values as never)
          .where(this.scoped(table, ...conditions)),
    }
  }

  /** Transakce se stejným omezením na běh. */
  transaction<R>(fn: (scope: RunScope) => Promise<R>): Promise<R> {
    return this.db.transaction((tx) => fn(new RunScope(this.runId, tx as unknown as Database)))
  }
}

/**
 * Jediná cesta aplikačního kódu k datům běhu.
 *
 * ```ts
 * const run = forRun('2026-09-12_A')
 * const postavy = await run.select(characters)
 * ```
 */
export function forRun(runId: string | RunId, db?: Database): RunScope {
  return new RunScope(parseRunId(runId), db)
}
