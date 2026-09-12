/**
 * Admin screen (§10.2): uploading files, version history, validation results.
 *
 * The run switcher sits in the header and the interface takes the run's colour,
 * because two runs are played at once and confusing them is the one mistake the
 * data model cannot undo (rule 2).
 */
import { forRun } from '@/db'
import { configVersions, runs } from '@/db/schema'
import { unscopedDb } from '@/db/client'
import { UploadPanel } from './report-view'
import { VersionHistory } from './version-history'
import { runTheme } from './run-theme'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ beh?: string }>
}

export default async function SpravaPage({ searchParams }: PageProps) {
  const { beh } = await searchParams

  let available: { id: string; label: string | null }[] = []
  let failure: string | undefined

  try {
    available = await unscopedDb
      .select({ id: runs.id, label: runs.label })
      .from(runs)
      .orderBy(runs.id)
  } catch (cause) {
    failure = cause instanceof Error ? cause.message : String(cause)
  }

  const runId = beh ?? available[0]?.id
  const theme = runId ? runTheme(runId) : undefined

  let versions: (typeof configVersions.$inferSelect)[] = []
  if (runId && !failure) {
    try {
      versions = (await forRun(runId).select(configVersions)).sort((a, b) => b.version - a.version)
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : String(cause)
    }
  }

  return (
    <div className="min-h-dvh">
      <header className={`${theme?.header ?? 'bg-neutral-800 text-white'} px-4 py-3`}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs opacity-80">Správa konfigurace</p>
            <h1 className="text-lg font-semibold">{runId ?? 'Žádný běh'}</h1>
          </div>
          {available.length > 0 && (
            <form className="flex items-center gap-2 text-sm">
              <label htmlFor="beh" className="opacity-80">
                Běh
              </label>
              <select
                id="beh"
                name="beh"
                defaultValue={runId}
                className="rounded bg-white/15 px-2 py-1 text-white"
              >
                {available.map((run) => (
                  <option key={run.id} value={run.id} className="text-neutral-900">
                    {run.id}
                    {run.label ? ` — ${run.label}` : ''}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded bg-white/20 px-2 py-1">
                Přepnout
              </button>
            </form>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {failure && (
          <p className="rounded bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Databáze zatím neodpovídá ({failure}). Kontrola souboru bez ukládání funguje i tak —
            ukládání a historie verzí potřebují databázi.
          </p>
        )}

        {!runId && !failure && (
          <p className="rounded bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
            Zatím není založený žádný běh. Konfiguraci jde zkontrolovat i tak, ale uložit se dá až
            do běhu.
          </p>
        )}

        <UploadPanel runId={runId ?? ''} accent={theme?.accent ?? 'border-neutral-400'} />

        {runId && <VersionHistory runId={runId} versions={versions} />}
      </main>
    </div>
  )
}
