import { AppHeader, RunThemeRoot } from '@/components'
import { todayIsoDate } from '@/core'
import { readAuthor } from '@/core/services/auth-cookies'
import { listRuns } from '@/db'
import { CreateRunForm, RunList } from '@/features/behy'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/** After logging in the org picks or creates a run (§3.2). */
const HomePage = async () => {
  const [runs, author] = await Promise.all([listRuns(), readAuthor()])

  return (
    <RunThemeRoot themeKey="none">
      <AppHeader runs={runs} author={author} />
      <main className={styles.main}>
        <div className={styles.content}>
          <RunList runs={runs} />
          <CreateRunForm runs={runs} defaultStartDate={todayIsoDate()} />
        </div>
      </main>
    </RunThemeRoot>
  )
}

export default HomePage
