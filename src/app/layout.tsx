import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { APP_LOCALE } from '@/locales/app-locale'
import { common } from '@/locales/cs/common'
import { AppThemeProvider } from '@/theme/AppThemeProvider/AppThemeProvider'

export const metadata: Metadata = {
  title: common.appTitle,
  description: common.appDescription,
}

// The CSS layer puts MUI styles below CSS Modules, so modules override them without `!important`.
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang={APP_LOCALE}>
    <body>
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <AppThemeProvider>{children}</AppThemeProvider>
      </AppRouterCacheProvider>
    </body>
  </html>
)

export default RootLayout
