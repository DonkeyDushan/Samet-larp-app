'use client'

/**
 * Version history (§6.5, §10.2).
 *
 * Every import is a version and none is ever replaced, so this is also the
 * record of what the config looked like when a chapter was computed.
 */
import { AuthorField } from '@/components'
import { sprava } from '@/locales/cs/sprava'
import { useExpandedVersion } from '../../hooks/useExpandedVersion'
import { useVersionActivation } from '../../hooks/useVersionActivation'
import type { VersionRow } from '../../types/version-row'
import { VersionItem } from './components/VersionItem/VersionItem'

interface VersionHistoryProps {
  runId: string
  versions: VersionRow[]
}

export const VersionHistory = ({ runId, versions }: VersionHistoryProps) => {
  const { author, setAuthor, hasAuthor, pending, activate } = useVersionActivation(runId)
  const { expandedId, toggle } = useExpandedVersion()

  if (versions.length === 0) {
    return (
      <section data-testid="version-history">
        <h2 className="text-base font-semibold">{sprava.historyTitle}</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{sprava.historyEmpty}</p>
      </section>
    )
  }

  return (
    <section data-testid="version-history">
      <h2 className="text-base font-semibold">{sprava.historyTitle}</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{sprava.historyIntro}</p>

      <div className="mt-3">
        <AuthorField value={author} onChange={setAuthor} className="max-w-xs" testId="version-history--author" />
      </div>

      <ul className="mt-3 divide-y divide-neutral-200 rounded border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {versions.map((version) => (
          <VersionItem
            key={version.id}
            runId={runId}
            version={version}
            isExpanded={expandedId === version.id}
            hasAuthor={hasAuthor}
            pending={pending}
            onToggle={toggle}
            onActivate={activate}
          />
        ))}
      </ul>
    </section>
  )
}
