import { RunThemeRoot } from '@/components'
import { readAppPassword, RETURN_PATH_PARAM, safeReturnPath } from '@/core'
import { readAuthor } from '@/core/services/auth-cookies'
import { LoginForm } from '@/features/pristup'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

interface LoginPageProps {
  searchParams: Promise<Partial<Record<typeof RETURN_PATH_PARAM, string | string[]>>>
}

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const requested = (await searchParams)[RETURN_PATH_PARAM]

  return (
    <RunThemeRoot themeKey="none">
      <main className={styles.main}>
        <LoginForm
          returnPath={safeReturnPath(typeof requested === 'string' ? requested : undefined)}
          defaultAuthor={await readAuthor()}
          isPasswordConfigured={readAppPassword() !== undefined}
        />
      </main>
    </RunThemeRoot>
  )
}

export default LoginPage
