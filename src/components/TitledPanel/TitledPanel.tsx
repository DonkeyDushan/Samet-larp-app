import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import styles from './TitledPanel.module.css'

export type PanelTone = 'neutral' | 'error' | 'warning'

interface TitledPanelProps {
  title: string
  note?: string
  tone?: PanelTone
  testId: string
  children: ReactNode
}

export const TitledPanel = ({ title, note, tone = 'neutral', testId, children }: TitledPanelProps) => (
  <Paper variant="outlined" className={styles.panel} data-tone={tone} data-testid={testId}>
    <div className={styles.head}>
      <Typography variant="subtitle2" component="h3">
        {title}
      </Typography>
      {note && (
        <Typography variant="caption" component="p" className={styles.note}>
          {note}
        </Typography>
      )}
    </div>
    {children}
  </Paper>
)
