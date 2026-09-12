import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { APP_LOCALE } from '@/locales/app-locale'
import { common } from '@/locales/cs/common'
import './globals.css'

export const metadata: Metadata = {
  title: common.appTitle,
  description: common.appDescription,
}

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang={APP_LOCALE}>
    <body className="min-h-dvh bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
      {children}
    </body>
  </html>
)

export default RootLayout
