/**
 * Veřejné rozhraní datové vrstvy.
 *
 * `unscopedDb` tady **záměrně není**: aplikační kód se k datům dostává jen
 * přes `forRun(runId)` (architektonické pravidlo 2). Skripty, které pracují
 * napříč běhy (migrace, seed, záloha), si `unscopedDb` naimportují přímo
 * z `./client` — a je to v diffu vidět.
 */
export * as schema from './schema'
export { forRun, parseRunId, RunScope, type RunId, type RunScopedTable } from './run-scope'
