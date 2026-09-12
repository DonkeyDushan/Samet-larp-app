'use client'

/**
 * Version history (§6.5, §10.2).
 *
 * Every import is a version and none is ever replaced, so this is also the
 * record of what the config looked like when a chapter was computed. Activating
 * a version is deliberate: a new import does not change a running game by itself.
 */
import { useState, useTransition } from 'react'
import { activateVersion } from './actions'
import type { Issue } from '@/import/issues'

interface VersionRow {
  id: string
  version: number
  isActive: boolean
  sourceFilename: string
  note: string | null
  createdAt: Date
  createdBy: string
  importReport: unknown
  diffFromPrevious: unknown
}

export function VersionHistory({ runId, versions }: { runId: string; versions: VersionRow[] }) {
  const [author, setAuthor] = useState('')
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState<string | undefined>()

  if (versions.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold">Historie verzí</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Zatím nebyla naimportovaná žádná konfigurace.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-base font-semibold">Historie verzí</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Běh počítá z aktivní verze. Nový import ji sám nepřepne — přepnutí jde do auditu (§6.5).
      </p>

      <label className="mt-3 block text-sm">
        <span className="font-medium">Kdo jsi?</span>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="mt-1 block w-full max-w-xs rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </label>

      <ul className="mt-3 divide-y divide-neutral-200 rounded border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {versions.map((version) => {
          const issues = extractIssues(version.importReport)
          const errors = issues.filter((i) => i.severity === 'chyba').length
          const warnings = issues.length - errors

          return (
            <li key={version.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    Verze {version.version}
                    {version.isActive && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
                        aktivní
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {version.sourceFilename} · {new Date(version.createdAt).toLocaleString('cs')} ·{' '}
                    {version.createdBy}
                    {version.note ? ` · ${version.note}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {warnings} varování{errors > 0 ? `, ${errors} chyb` : ''}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(open === version.id ? undefined : version.id)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                  >
                    {open === version.id ? 'Skrýt' : 'Výsledky kontrol'}
                  </button>
                  {!version.isActive && (
                    <button
                      disabled={pending || author.trim() === ''}
                      onClick={() => {
                        const data = new FormData()
                        data.set('runId', runId)
                        data.set('versionId', version.id)
                        data.set('author', author)
                        startTransition(() => activateVersion(data))
                      }}
                      className="rounded bg-neutral-800 px-2 py-1 text-xs text-white disabled:opacity-40 dark:bg-neutral-200 dark:text-neutral-900"
                      title={author.trim() === '' ? 'Nejdřív vyplň, kdo jsi.' : undefined}
                    >
                      Aktivovat pro běh {runId}
                    </button>
                  )}
                </div>
              </div>

              {open === version.id && (
                <ul className="mt-3 space-y-1 border-t border-neutral-200 pt-2 text-xs dark:border-neutral-800">
                  {issues.length === 0 && <li className="text-neutral-500">Kontroly nic nenašly.</li>}
                  {issues.map((issue, index) => (
                    <li key={index}>
                      <span className="font-mono text-neutral-500">
                        {issue.location.sheet}
                        {issue.location.cell ? ` · ${issue.location.cell}` : ''}
                      </span>{' '}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function extractIssues(report: unknown): Issue[] {
  if (report && typeof report === 'object' && 'issues' in report) {
    const issues = (report as { issues: unknown }).issues
    if (Array.isArray(issues)) return issues as Issue[]
  }
  return []
}
