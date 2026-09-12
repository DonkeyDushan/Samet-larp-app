/**
 * Writing a checked config into the database (§6.5, §10.2).
 *
 *  - **Every import is a new version.** `config_versions` grows; nothing is
 *    ever replaced. A version carries the import report and the diff, so the
 *    admin screen can show what an import did long after the fact.
 *  - **A new version does not change a running game by itself** (§6.5). The
 *    version is written inactive and the org activates it deliberately.
 *  - **Nothing is deleted.** Config entities are keyed by their source ID, so a
 *    re-import updates them in place and stamps `source_config_version_id`.
 *    An entity the sheet no longer carries keeps its old stamp and so drops out
 *    of the active set without a single delete.
 *
 * All access goes through `forRun(runId)` — architecture rule 2.
 */
import { forRun, type RunScope } from '@/db'
import { auditLog, configVersions } from '@/db/schema'
import { configSnapshot, diffSnapshots, type ConfigDiff, type EntitySnapshot } from '../diff'
import { fingerprintConfig } from '../fingerprint'
import type { Issue } from '../types/issue'
import type { ParsedConfig } from '../types/parsed-config'
import { writeEntities } from './write-entities'

export interface PersistInput {
  runId: string
  config: ParsedConfig
  issues: Issue[]
  sourceFilename: string
  /** Free-text name from the „Kdo jsi?" field (§3.1). */
  author: string
  note?: string
}

export interface PersistResult {
  configVersionId: string
  version: number
  diff: ConfigDiff
  /** True when an identical version already existed and nothing was written. */
  alreadyImported: boolean
}

/**
 * Writes a new config version. Refuses a config with errors: a broken config
 * must never reach the database, only the report (§10.2).
 */
export const persistConfig = async (input: PersistInput): Promise<PersistResult> => {
  if (input.issues.some((i) => i.severity === 'chyba')) {
    throw new Error(
      'Konfigurace obsahuje chyby a nedá se uložit. Oprav je v tabulce a nahraj soubor znovu.',
    )
  }

  const hash = fingerprintConfig(input.config)
  const snapshot = configSnapshot(input.config)

  return forRun(input.runId).transaction(async (scope) => {
    const versions = await scope.select(configVersions)
    const diff = diffSnapshots(newestSnapshot(versions), snapshot)

    // Re-uploading the same sheet must not duplicate anything (§10.2).
    const existing = versions.find((v) => v.sourceHash === hash)
    if (existing) {
      return { configVersionId: existing.id, version: existing.version, diff, alreadyImported: true }
    }

    const nextNumber = versions.reduce((max, v) => Math.max(max, v.version), 0) + 1

    const [created] = await scope
      .insert(configVersions, {
        version: nextNumber,
        // §6.5: a running game does not change until the org says so.
        isActive: false,
        sourceFilename: input.sourceFilename,
        sourceHash: hash,
        diffFromPrevious: diff,
        contentSnapshot: snapshot,
        importReport: { issues: input.issues, repairs: input.config.repairs },
        note: input.note ?? null,
        createdBy: input.author,
      })
      .returning()
    if (!created) throw new Error('Verzi konfigurace se nepodařilo založit.')

    await writeEntities(scope, input.config, created.id)
    await writeImportAudit(scope, input, created.id, nextNumber, hash, diff)

    return { configVersionId: created.id, version: nextNumber, diff, alreadyImported: false }
  })
}

type ConfigVersionRow = typeof configVersions.$inferSelect

/** Snapshot of the newest stored version, or undefined on a first import. */
export const newestSnapshot = (versions: ConfigVersionRow[]): EntitySnapshot[] | undefined => {
  let newest: ConfigVersionRow | undefined
  for (const version of versions) {
    if (!newest || version.version > newest.version) newest = version
  }

  return (newest?.contentSnapshot as EntitySnapshot[] | null | undefined) ?? undefined
}

const writeImportAudit = async (
  scope: RunScope,
  input: PersistInput,
  versionId: string,
  version: number,
  hash: string,
  diff: ConfigDiff,
): Promise<void> => {
  await scope.insert(auditLog, {
    action: 'konfigurace.import',
    entityKind: 'config_version',
    entityId: versionId,
    summary: `Import konfigurace ze souboru ${input.sourceFilename}: verze ${version}, ${diff.counts.added} přibylo, ${diff.counts.changed} změněno, ${diff.counts.removed} zmizelo.`,
    valueAfter: { version, hash, counts: diff.counts },
    author: input.author,
  })
}
