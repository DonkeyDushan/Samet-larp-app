'use client'

/**
 * Upload form and the report it produces (§10.2).
 *
 * The check button is the primary one: the author uploads, reads the list, fixes
 * the sheet and repeats. Writing to the database is the second step and stays
 * disabled while there is any error.
 */
import { useState, useTransition } from 'react'
import { checkUpload, importUpload, type UploadReport } from './actions'
import type { Issue } from '@/import/issues'
import { ENTITY_LABELS } from '@/import/diff'

export function UploadPanel({ runId, accent }: { runId: string; accent: string }) {
  const [report, setReport] = useState<UploadReport | undefined>()
  const [pending, startTransition] = useTransition()
  const [author, setAuthor] = useState('')

  const submit = (action: (data: FormData) => Promise<UploadReport>) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    startTransition(async () => setReport(await action(data)))
  }

  return (
    <section className={`rounded border-l-4 ${accent} bg-neutral-50 p-4 dark:bg-neutral-900`}>
      <h2 className="text-base font-semibold">Nahrání konfigurace</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Stáhni Google Sheet přes <em>Soubor → Stáhnout → Microsoft Excel</em> a přetáhni sem jeden
        soubor <code>.xlsx</code> se všemi listy.
      </p>

      <form className="mt-4 space-y-4" onSubmit={submit(checkUpload)}>
        <input type="hidden" name="runId" value={runId} />

        <label className="block text-sm">
          <span className="font-medium">Konfigurace (.xlsx)</span>
          <input
            type="file"
            name="config"
            accept=".xlsx"
            className="mt-1 block w-full text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Šablony (.md nebo .zip)</span>
          <input type="file" name="templates" accept=".md,.zip" multiple className="mt-1 block w-full text-sm" />
          <span className="mt-1 block text-xs text-neutral-500">
            Nahrávají se jednou za kapitolu. Bez nich se kontroly značek v šablonách nespustí.
          </span>
        </label>

        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
            Záložní cesta: jednotlivé .csv
          </summary>
          <input type="file" name="configCsv" accept=".csv" multiple className="mt-2 block w-full text-sm" />
          <p className="mt-1 text-xs text-neutral-500">
            Deset listů znamená deset souborů. Použij, jen když se .xlsx nedá stáhnout.
          </p>
        </details>

        <label className="block text-sm">
          <span className="font-medium">Kdo jsi?</span>
          <input
            name="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Natálie"
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Import se zapisuje do auditu se jménem. Nutné jen pro uložení, ne pro kontrolu.
          </span>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Poznámka k verzi</span>
          <input
            name="note"
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900"
          >
            {pending ? 'Kontroluji…' : 'Zkontrolovat bez uložení'}
          </button>
          <button
            type="submit"
            disabled={pending || (report !== undefined && !report.ok)}
            formNoValidate
            onClick={(event) => {
              event.preventDefault()
              const form = event.currentTarget.form
              if (!form) return
              const data = new FormData(form)
              startTransition(async () => setReport(await importUpload(data)))
            }}
            className="rounded border border-neutral-400 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-neutral-600"
          >
            Uložit jako novou verzi
          </button>
        </div>
      </form>

      {report && <Report report={report} runId={runId} author={author} />}
    </section>
  )
}

function Report({ report, runId, author }: { report: UploadReport; runId: string; author: string }) {
  return (
    <div className="mt-6 space-y-4 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
      {report.failure && (
        <p className="rounded bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          {report.failure}
        </p>
      )}

      {report.filename !== '' && (
        <p>
          <strong>{report.filename}</strong>{' '}
          {report.ok ? (
            <span className="text-green-700 dark:text-green-400">— konfigurace je použitelná</span>
          ) : (
            <span className="text-red-700 dark:text-red-400">
              — konfigurace se nedá použít, dokud se chyby neopraví
            </span>
          )}
        </p>
      )}

      {report.version !== undefined && (
        <p className="rounded bg-green-50 p-3 text-green-900 dark:bg-green-950 dark:text-green-100">
          {report.alreadyImported
            ? `Tenhle soubor už je naimportovaný jako verze ${report.version}. Nic se nezdvojilo.`
            : `Uloženo jako verze ${report.version}. Běh z ní začne počítat, až ji aktivuješ.`}
        </p>
      )}

      {report.counts && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          <Stat label="Kapitoly" value={(report.chapters ?? []).join(', ') || '—'} />
          <Stat label="Postavy" value={report.counts.characters} />
          <Stat label="Otázky" value={report.counts.questions} />
          <Stat label="Odpovědi" value={report.counts.answers} />
          <Stat label="Bloky" value={report.counts.blocks} />
          <Stat label="Varianty" value={report.counts.variations} />
        </dl>
      )}

      {report.repairs && <Repairs repairs={report.repairs} ignored={report.ignoredSheets ?? []} />}

      <IssueList
        title={`Chyby (${report.errorCount})`}
        note="Blokují použití konfigurace."
        issues={report.issues.filter((i) => i.severity === 'chyba')}
        tone="red"
      />
      <IssueList
        title={`Varování (${report.warningCount})`}
        note="Konfigurace projde, ale stojí za podívání."
        issues={report.issues.filter((i) => i.severity === 'varovani')}
        tone="amber"
      />

      {report.diff && <DiffView diff={report.diff} />}
      {report.coverage && <Coverage coverage={report.coverage} />}

      <input type="hidden" value={`${runId}|${author}`} readOnly />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function Repairs({
  repairs,
  ignored,
}: {
  repairs: NonNullable<UploadReport['repairs']>
  ignored: string[]
}) {
  const notes = [
    repairs.filledDownCells > 0 &&
      `doplněno ${repairs.filledDownCells} slučovaných buněk směrem dolů`,
    repairs.trimmedCells > 0 && `ořezáno ${repairs.trimmedCells} buněk s mezerami`,
    repairs.skippedEmptyRows > 0 && `přeskočeno ${repairs.skippedEmptyRows} prázdných řádků`,
    repairs.resolvedCharacterNames > 0 &&
      `${repairs.resolvedCharacterNames}× dohledána postava podle jména místo ID`,
    repairs.droppedScaleStrategies > 0 &&
      `${repairs.droppedScaleStrategies}× ignorována strategie slučování u osobní škály`,
    ignored.length > 0 && `nepoužité listy: ${ignored.join(', ')}`,
  ].filter(Boolean)

  if (notes.length === 0) return null

  return (
    <div className="rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">
      <p className="font-medium">Co se při čtení ošetřilo</p>
      <ul className="mt-1 list-disc pl-4">
        {notes.map((note) => (
          <li key={String(note)}>{note}</li>
        ))}
      </ul>
    </div>
  )
}

function IssueList({
  title,
  note,
  issues,
  tone,
}: {
  title: string
  note: string
  issues: Issue[]
  tone: 'red' | 'amber'
}) {
  if (issues.length === 0) return null
  const colour =
    tone === 'red'
      ? 'border-red-300 dark:border-red-900'
      : 'border-amber-300 dark:border-amber-900'

  return (
    <div className={`rounded border ${colour}`}>
      <div className="border-b border-inherit px-3 py-2">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-neutral-500">{note}</p>
      </div>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {issues.map((issue, index) => (
          <li key={`${issue.code}-${index}`} className="px-3 py-2">
            <p className="font-mono text-xs text-neutral-500">{where(issue)}</p>
            <p className="mt-0.5">{issue.message}</p>
            {issue.suggestion && (
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                Mysleli jste <code className="font-medium">{issue.suggestion}</code>?
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Sheet, row, column and cell — the author has to find the row in the table. */
function where(issue: Issue): string {
  const { sheet, row, column, cell } = issue.location
  const parts = [sheet]
  if (cell) parts.push(cell)
  else if (row !== undefined) parts.push(`řádek ${row}`)
  if (column) parts.push(column)
  return parts.join(' · ')
}

function DiffView({ diff }: { diff: NonNullable<UploadReport['diff']> }) {
  if (diff.identical) {
    return (
      <p className="rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">
        Proti poslední verzi se nic nezměnilo.
      </p>
    )
  }

  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-inherit px-3 py-2">
        <h3 className="font-semibold">Proti poslední verzi</h3>
        <p className="text-xs text-neutral-500">
          {diff.counts.added} přibylo · {diff.counts.changed} změněno · {diff.counts.removed} zmizelo
        </p>
      </div>
      <div className="max-h-80 overflow-y-auto p-3 text-xs">
        <DiffGroup title="Přibylo" entries={diff.added} />
        <DiffGroup title="Změnilo se" entries={diff.changed} />
        <DiffGroup title="Zmizelo" entries={diff.removed} />
      </div>
    </div>
  )
}

function DiffGroup({
  title,
  entries,
}: {
  title: string
  entries: NonNullable<UploadReport['diff']>['added']
}) {
  if (entries.length === 0) return null
  return (
    <div className="mb-3">
      <p className="font-medium">
        {title} ({entries.length})
      </p>
      <ul className="mt-1 space-y-1">
        {entries.map((entry) => (
          <li key={`${entry.kind}-${entry.chapter ?? '-'}-${entry.id}`}>
            <span className="text-neutral-500">
              {ENTITY_LABELS[entry.kind]}
              {entry.chapter ? ` (kap. ${entry.chapter})` : ''}:{' '}
            </span>
            <code>{entry.id}</code>
            {entry.changes && (
              <ul className="ml-4 mt-0.5 space-y-0.5 text-neutral-600 dark:text-neutral-400">
                {entry.changes.map((change) => (
                  <li key={change.field}>
                    {change.field}: <s>{change.before || '—'}</s> → {change.after || '—'}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Coverage({ coverage }: { coverage: NonNullable<UploadReport['coverage']> }) {
  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-inherit px-3 py-2">
        <h3 className="font-semibold">Šablony postav</h3>
        <p className="text-xs text-neutral-500">
          {coverage.missingCount === 0
            ? 'Každá postava má šablonu.'
            : `Chybí ${coverage.missingCount} šablon.`}
        </p>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {coverage.assignments.map((row) => (
            <tr key={row.characterExternalId}>
              <td className="px-3 py-1.5">{row.characterName}</td>
              <td className="px-3 py-1.5 font-mono text-neutral-500">{row.expected || '—'}</td>
              <td className="px-3 py-1.5">
                {row.status === 'prirazena' && <span className="text-green-700 dark:text-green-400">{row.filename}</span>}
                {row.status === 'chybi' && <span className="text-red-700 dark:text-red-400">nenahraná</span>}
                {row.status === 'nezadana' && (
                  <span className="text-red-700 dark:text-red-400">bez Template ID v tabulce</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {coverage.unmatched.length > 0 && (
        <p className="border-t border-inherit px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Nahráno, ale nepatří žádné postavě: {coverage.unmatched.map((t) => t.filename).join(', ')}
        </p>
      )}
    </div>
  )
}
