/**
 * Engine pravidel (§7) — čistá funkce bez databáze, sítě a Reactu.
 *
 * V téhle session jsou hotové jen typy; implementace `evaluate` přijde
 * v další (harmonogram §15.1, týdny 3–5).
 */
export * from './types'

/** Verze enginu, která se zapisuje ke každému přepočtu (`computations.engine_version`). */
export const ENGINE_VERSION = '0.0.0-schema'
