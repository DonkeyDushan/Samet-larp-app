import Chip from '@mui/material/Chip'
import type { ChapterSummary } from '@/core'
import { navigation } from '@/locales/cs/navigation'
import { statuses } from '@/locales/cs/statuses'
import styles from './ChapterStatuses.module.css'

/** Chapter states are shown only; moving between them comes in later sessions. */
export const ChapterStatuses = ({ chapters }: { chapters: ChapterSummary[] }) => (
  <ul className={styles.list} aria-label={navigation.chaptersLabel} data-testid="chapter-statuses">
    {chapters.map((chapter) => (
      <li key={chapter.number}>
        <Chip
          variant="outlined"
          label={navigation.chapter(chapter.number, statuses.chapter[chapter.status], chapter.isTouched)}
          className={styles.chip}
          data-status={chapter.status}
          data-touched={chapter.isTouched}
          data-testid={`chapter-status--${chapter.number}`}
        />
      </li>
    ))}
  </ul>
)
