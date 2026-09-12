import type { ReactNode } from 'react'
import type { RunThemeKey } from '@/theme/constants/run-colors'
import styles from './RunThemeRoot.module.css'

interface RunThemeRootProps {
  themeKey: RunThemeKey
  children: ReactNode
}

export const RunThemeRoot = ({ themeKey, children }: RunThemeRootProps) => (
  <div className={styles.root} data-run={themeKey} data-testid="run-theme-root">
    {children}
  </div>
)
