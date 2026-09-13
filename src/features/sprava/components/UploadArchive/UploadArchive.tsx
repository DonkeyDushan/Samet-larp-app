'use client'

/**
 * Archive of uploaded files (§6.5).
 *
 * The run has one valid config; these files are the record of what it was
 * computed from, kept exactly as uploaded.
 */
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { sprava } from '@/locales/cs/sprava'
import { useExpandedUpload } from '../../hooks/useExpandedUpload'
import type { ArchiveRow } from '../../types/archive-row'
import { ArchiveItem } from './components/ArchiveItem/ArchiveItem'
import styles from './UploadArchive.module.css'

interface UploadArchiveProps {
  runId: string
  uploads: ArchiveRow[]
}

export const UploadArchive = ({ runId, uploads }: UploadArchiveProps) => {
  const { expandedId, toggle } = useExpandedUpload()

  return (
    <section data-testid="upload-archive">
      <Typography variant="h6" component="h2">
        {sprava.archiveTitle}
      </Typography>
      <Typography variant="body2" className={styles.hint}>
        {uploads.length === 0 ? sprava.archiveEmpty : sprava.archiveIntro}
      </Typography>

      {uploads.length > 0 && (
        <Paper variant="outlined" component="ul" className={styles.list}>
          {uploads.map((upload) => (
            <ArchiveItem key={upload.id} runId={runId} upload={upload} isExpanded={expandedId === upload.id} onToggle={toggle} />
          ))}
        </Paper>
      )}
    </section>
  )
}
