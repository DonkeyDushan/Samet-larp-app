/**
 * Datové schéma aplikace. Jediný zdroj pravdy o struktuře databáze —
 * migrace se z něj generují (`npm run db:generate`), nepíšou se ručně.
 *
 * Architektonická pravidla, která schéma vynucuje:
 *  1. `run_id` je v každé tabulce s herními daty a každý odkaz uvnitř běhu je
 *     složený cizí klíč `(run_id, id)`. Data dvou běhů se nemají jak potkat.
 *  2. Nic se nemaže: všechny cizí klíče jsou `on delete restrict`.
 *  3. Stav se verzuje, nepřepisuje: snapshoty stavu nesou `computation_id`.
 *  4. `audit_log` je append-only, vynuceno triggerem v `db/sql/`.
 */
export * from './enums'
export * from './runs'
export * from './characters'
export * from './scales'
export * from './questions'
export * from './rules'
export * from './computations'
export * from './state'
export * from './templates'
export * from './audit'
