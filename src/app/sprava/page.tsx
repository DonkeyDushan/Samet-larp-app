/** Admin screen route (§10.2); the screen itself lives in `features/sprava`. */
import { RunHeader } from '@/components'
import { RUN_QUERY_PARAM } from '@/core'
import { loadAdminData, UploadPanel, VersionHistory } from '@/features/sprava'
import { errors } from '@/locales/cs/errors'
import { sprava } from '@/locales/cs/sprava'
import { runTheme } from '@/theme/run-theme'

export const dynamic = 'force-dynamic'

interface SpravaPageProps {
  searchParams: Promise<Partial<Record<typeof RUN_QUERY_PARAM, string>>>
}

const SpravaPage = async ({ searchParams }: SpravaPageProps) => {
  const params = await searchParams
  const { runs, runId, versions, failure } = await loadAdminData(params[RUN_QUERY_PARAM])

  const theme = runTheme(runId)

  return (
    <div className="min-h-dvh">
      <RunHeader section={sprava.title} runId={runId} runs={runs} colorClassName={theme.header} />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {failure && (
          <p
            className="rounded bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
            data-testid="sprava--db-failure"
          >
            {errors.databaseUnavailable(failure)}
          </p>
        )}

        {!runId && !failure && (
          <p className="rounded bg-neutral-100 p-3 text-sm dark:bg-neutral-800" data-testid="sprava--no-run">
            {sprava.noRunYet}
          </p>
        )}

        <UploadPanel runId={runId ?? ''} accentClassName={theme.accent} />

        {runId && <VersionHistory runId={runId} versions={versions} />}
      </main>
    </div>
  )
}

export default SpravaPage
