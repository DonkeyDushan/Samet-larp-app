/** Admin screen route (§10.2); the screen itself lives in `features/sprava`. */
import Alert from '@mui/material/Alert'
import { RunHeader, RunThemeRoot } from '@/components'
import { RUN_QUERY_PARAM } from '@/core'
import { loadAdminData, UploadPanel, VersionHistory } from '@/features/sprava'
import { errors } from '@/locales/cs/errors'
import { sprava } from '@/locales/cs/sprava'
import { runThemeKey } from '@/theme/run-theme'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

interface SpravaPageProps {
  searchParams: Promise<Partial<Record<typeof RUN_QUERY_PARAM, string>>>
}

const SpravaPage = async ({ searchParams }: SpravaPageProps) => {
  const params = await searchParams
  const { runs, runId, versions, failure } = await loadAdminData(params[RUN_QUERY_PARAM])

  return (
    <RunThemeRoot themeKey={runThemeKey(runId)}>
      <RunHeader section={sprava.title} runId={runId} runs={runs} />

      <main className={styles.main}>
        {failure && (
          <Alert severity="warning" data-testid="sprava--db-failure">
            {errors.databaseUnavailable(failure)}
          </Alert>
        )}

        {!runId && !failure && (
          <Alert severity="info" data-testid="sprava--no-run">
            {sprava.noRunYet}
          </Alert>
        )}

        <UploadPanel runId={runId ?? ''} />

        {runId && <VersionHistory runId={runId} versions={versions} />}
      </main>
    </RunThemeRoot>
  )
}

export default SpravaPage
