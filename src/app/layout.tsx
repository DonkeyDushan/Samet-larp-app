import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sametový LARP — engine',
  description: 'Interní nástroj organizátorů pro zpracování dotazníků mezi kapitolami.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-dvh bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  )
}
