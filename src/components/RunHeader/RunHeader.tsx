/**
 * Header with the run switcher, present on every screen (§6.4). It takes the
 * run's colour because confusing two runs is the one mistake the data model
 * cannot undo (rule 2).
 */
import type { RunSummary } from '@/db'
import { RUN_QUERY_PARAM } from '@/core'
import { common } from '@/locales/cs/common'

interface RunHeaderProps {
  section: string
  runId: string | undefined
  runs: RunSummary[]
  colorClassName: string
}

export const RunHeader = ({ section, runId, runs, colorClassName }: RunHeaderProps) => (
  <header className={`${colorClassName} px-4 py-3`} data-testid="run-header">
    <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs opacity-80">{section}</p>
        <h1 className="text-lg font-semibold" data-testid="run-header--run-id">
          {runId ?? common.noRun}
        </h1>
      </div>
      {runs.length > 0 && (
        <form className="flex items-center gap-2 text-sm" data-testid="run-switcher">
          <label htmlFor={RUN_QUERY_PARAM} className="opacity-80">
            {common.run}
          </label>
          <select
            id={RUN_QUERY_PARAM}
            name={RUN_QUERY_PARAM}
            defaultValue={runId}
            className="rounded bg-white/15 px-2 py-1 text-white"
            data-testid="run-switcher--select"
          >
            {runs.map((run) => (
              <option key={run.id} value={run.id} className="text-neutral-900">
                {common.runOption(run.id, run.label)}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-white/20 px-2 py-1" data-testid="run-switcher--submit">
            {common.switchRun}
          </button>
        </form>
      )}
    </div>
  </header>
)
