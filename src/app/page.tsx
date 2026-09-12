import Typography from '@mui/material/Typography'
import { common } from '@/locales/cs/common'
import styles from './page.module.css'

/** Placeholder page; the real layout (§6.4) comes after the engine. */
const Page = () => (
  <main className={styles.main}>
    <Typography variant="h5" component="h1">
      {common.appTitle}
    </Typography>
    <Typography variant="body2" className={styles.body}>
      {common.placeholderBody}
    </Typography>
  </main>
)

export default Page
