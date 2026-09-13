import { runThemeKey } from '@/theme/run-theme'
import styles from './RunBadge.module.css'

interface RunBadgeProps {
  runId: string
  letter: string | undefined
  testId?: string
}

/** Run ID with its colour swatch, for places outside the run's own coloured screen. */
export const RunBadge = ({ runId, letter, testId }: RunBadgeProps) => (
  <span className={styles.badge} data-run={runThemeKey(letter)} data-testid={testId}>
    {runId}
  </span>
)
