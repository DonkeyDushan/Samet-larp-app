'use client'

/**
 * Version history (§6.5, §10.2).
 *
 * Every import is a version and none is ever replaced, so this is also the
 * record of what the config looked like when a chapter was computed.
 */
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { AuthorField } from '@/components'
import { sprava } from '@/locales/cs/sprava'
import { useExpandedVersion } from '../../hooks/useExpandedVersion'
import { useVersionActivation } from '../../hooks/useVersionActivation'
import type { VersionRow } from '../../types/version-row'
import { VersionItem } from './components/VersionItem/VersionItem'
import styles from './VersionHistory.module.css'

interface VersionHistoryProps {
  runId: string
  versions: VersionRow[]
}

export const VersionHistory = ({ runId, versions }: VersionHistoryProps) => {
  const { author, setAuthor, hasAuthor, pending, activate } = useVersionActivation(runId)
  const { expandedId, toggle } = useExpandedVersion()

  if (versions.length === 0) {
    return (
      <section data-testid="version-history">
        <Typography variant="h6" component="h2">
          {sprava.historyTitle}
        </Typography>
        <Typography variant="body2" className={styles.hint}>
          {sprava.historyEmpty}
        </Typography>
      </section>
    )
  }

  return (
    <section data-testid="version-history">
      <Typography variant="h6" component="h2">
        {sprava.historyTitle}
      </Typography>
      <Typography variant="body2" className={styles.hint}>
        {sprava.historyIntro}
      </Typography>

      <div className={styles.author}>
        <AuthorField value={author} onChange={setAuthor} narrow testId="version-history--author" />
      </div>

      <Paper variant="outlined" component="ul" className={styles.list}>
        {versions.map((version) => (
          <VersionItem
            key={version.id}
            runId={runId}
            version={version}
            isExpanded={expandedId === version.id}
            hasAuthor={hasAuthor}
            pending={pending}
            onToggle={toggle}
            onActivate={activate}
          />
        ))}
      </Paper>
    </section>
  )
}
