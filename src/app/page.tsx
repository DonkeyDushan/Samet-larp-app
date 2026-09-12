import { common } from '@/locales/cs/common'

/** Placeholder page; the real layout (§6.4) comes after the engine. */
const Page = () => (
  <main className="mx-auto max-w-2xl px-4 py-12">
    <h1 className="text-xl font-semibold">{common.appTitle}</h1>
    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{common.placeholderBody}</p>
  </main>
)

export default Page
