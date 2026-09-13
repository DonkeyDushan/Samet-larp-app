import Typography from '@mui/material/Typography'
import type { RunSection } from '@/core'
import { navigation } from '@/locales/cs/navigation'
import styles from './SectionPlaceholder.module.css'

/** A section whose screen comes in a later session; the navigation to it already stands (§6.4). */
export const SectionPlaceholder = ({ section }: { section: RunSection }) => (
  <section className={styles.section} data-testid={`section-placeholder--${section}`}>
    <Typography variant="h5" component="h1">
      {navigation.sections[section]}
    </Typography>
    <Typography variant="body2" className={styles.body}>
      {navigation.sectionPlaceholders[section]}
    </Typography>
  </section>
)
