import { eq } from 'drizzle-orm'
import { forRun } from '@/db'
import { auditLog, configVersions } from '@/db/schema'

/**
 * Makes a version the one the run computes from (§6.5). Deliberately separate
 * from the import: the org sees the diff first and then decides.
 */
export const activateConfigVersion = async (
  runId: string,
  configVersionId: string,
  author: string,
): Promise<void> => {
  await forRun(runId).transaction(async (scope) => {
    const versions = await scope.select(configVersions)
    const target = versions.find((v) => v.id === configVersionId)
    if (!target) throw new Error(`Verze konfigurace ${configVersionId} v tomto běhu neexistuje.`)

    const previous = versions.find((v) => v.isActive)

    // The partial unique index allows one active version per run, so the old
    // one has to step down first.
    if (previous) {
      await scope.update(configVersions, eq(configVersions.id, previous.id)).set({ isActive: false })
    }
    await scope.update(configVersions, eq(configVersions.id, configVersionId)).set({ isActive: true })

    await scope.insert(auditLog, {
      action: 'konfigurace.aktivace',
      entityKind: 'config_version',
      entityId: configVersionId,
      summary: `Běh počítá z verze konfigurace ${target.version}${previous ? ` (dřív ${previous.version})` : ''}.`,
      valueBefore: previous ? { version: previous.version } : null,
      valueAfter: { version: target.version },
      author,
    })
  })
}
