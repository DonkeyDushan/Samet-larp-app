/**
 * Header with the run switcher, present on every screen (§6.4). Its colour
 * comes from `RunThemeRoot`, because confusing two runs is the one mistake the
 * data model cannot undo (rule 2).
 */
import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import NativeSelect from '@mui/material/NativeSelect'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { RUN_QUERY_PARAM } from '@/core'
import type { RunSummary } from '@/db'
import { common } from '@/locales/cs/common'
import styles from './RunHeader.module.css'

interface RunHeaderProps {
  section: string
  runId: string | undefined
  runs: RunSummary[]
}

export const RunHeader = ({ section, runId, runs }: RunHeaderProps) => (
  <AppBar position="static" elevation={0} className={styles.header} data-testid="run-header">
    <Toolbar variant="dense" className={styles.toolbar}>
      <div>
        <Typography variant="caption" component="p" className={styles.dimmed}>
          {section}
        </Typography>
        <Typography variant="h6" component="h1" data-testid="run-header--run-id">
          {runId ?? common.noRun}
        </Typography>
      </div>
      {runs.length > 0 && (
        <form className={styles.switcher} data-testid="run-switcher">
          <label htmlFor={RUN_QUERY_PARAM} className={styles.dimmed}>
            {common.run}
          </label>
          <NativeSelect
            defaultValue={runId}
            className={styles.select}
            inputProps={{ id: RUN_QUERY_PARAM, name: RUN_QUERY_PARAM }}
            data-testid="run-switcher--select"
          >
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {common.runOption(run.id, run.label)}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" variant="outlined" color="inherit" data-testid="run-switcher--submit">
            {common.switchRun}
          </Button>
        </form>
      )}
    </Toolbar>
  </AppBar>
)
