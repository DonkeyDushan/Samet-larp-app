'use server'

/**
 * Server actions of the admin screen (§10.2, §10.3).
 *
 * The upload path deliberately splits in two: parsing and validating happen
 * first and produce a report, and only a config without errors is written. So a
 * broken sheet can never reach the database — it only ever produces a list of
 * things to fix.
 */
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { forRun } from '@/db'
import { configVersions } from '@/db/schema'
import { importXlsx, importCsvFiles, type ImportResult } from '@/import'
import { activateConfigVersion, persistConfig } from '@/import/persist'
import { readTemplateFiles, templateCoverage, type TemplateCoverage } from '@/import/template-upload'
import type { ConfigDiff, EntitySnapshot } from '@/import/diff'
import type { Issue } from '@/import/issues'

export interface UploadReport {
  ok: boolean
  filename: string
  /** Present even when the config was refused — that is the point. */
  issues: Issue[]
  errorCount: number
  warningCount: number
  repairs?: ImportResult['config']['repairs']
  chapters?: number[]
  counts?: { characters: number; questions: number; answers: number; blocks: number; variations: number }
  diff?: ConfigDiff
  coverage?: TemplateCoverage
  ignoredSheets?: string[]
  /** Set when the config was written. */
  version?: number
  alreadyImported?: boolean
  /** Set when something went wrong outside validation. */
  failure?: string
}

/**
 * Parses and checks an upload without writing anything — the dry run the author
 * uses to fix twenty typos in one round.
 */
export async function checkUpload(formData: FormData): Promise<UploadReport> {
  try {
    const result = await parseUpload(formData)
    if (!result) {
      return {
        ok: false,
        filename: '',
        issues: [],
        errorCount: 0,
        warningCount: 0,
        failure: 'Nevybral se žádný soubor s konfigurací.',
      }
    }
    return await describe(result.filename, result.imported, formData)
  } catch (cause) {
    // A broken file must never take the application down (§10.2).
    return {
      ok: false,
      filename: '',
      issues: [],
      errorCount: 0,
      warningCount: 0,
      failure: `Soubor se nepodařilo přečíst: ${message(cause)}`,
    }
  }
}

/** Checks and, when there is no error, writes a new config version. */
export async function importUpload(formData: FormData): Promise<UploadReport> {
  const runId = String(formData.get('runId') ?? '')
  const author = String(formData.get('author') ?? '').trim()

  if (author === '') {
    return {
      ok: false,
      filename: '',
      issues: [],
      errorCount: 0,
      warningCount: 0,
      failure: 'Vyplň „Kdo jsi?" — každá změna se zapisuje do auditu se jménem.',
    }
  }

  const report = await checkUpload(formData)
  if (!report.ok || report.failure) return report

  try {
    const result = await parseUpload(formData)
    if (!result) return report

    const persisted = await persistConfig({
      runId,
      config: result.imported.config,
      issues: result.imported.issues,
      sourceFilename: result.filename,
      author,
      note: String(formData.get('note') ?? '') || undefined,
    })

    revalidatePath('/sprava')
    return {
      ...report,
      version: persisted.version,
      alreadyImported: persisted.alreadyImported,
      diff: persisted.diff,
    }
  } catch (cause) {
    return { ...report, ok: false, failure: message(cause) }
  }
}

export async function activateVersion(formData: FormData): Promise<void> {
  const runId = String(formData.get('runId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const author = String(formData.get('author') ?? '').trim()
  if (author === '') throw new Error('Vyplň „Kdo jsi?" — aktivace jde do auditu.')

  await activateConfigVersion(runId, versionId, author)
  revalidatePath('/sprava')
}

/** Reads the uploaded config: one `.xlsx`, or several `.csv` as a fallback. */
async function parseUpload(
  formData: FormData,
): Promise<{ filename: string; imported: ImportResult } | undefined> {
  const xlsx = formData.get('config')
  if (xlsx instanceof File && xlsx.size > 0) {
    const templates = await uploadedTemplates(formData)
    return {
      filename: xlsx.name,
      imported: importXlsx(await xlsx.arrayBuffer(), templates),
    }
  }

  const csvFiles = formData.getAll('configCsv').filter((f): f is File => f instanceof File && f.size > 0)
  if (csvFiles.length === 0) return undefined

  const files = await Promise.all(
    csvFiles.map(async (file) => ({ filename: file.name, text: await file.text() })),
  )
  return {
    filename: csvFiles.map((f) => f.name).join(', '),
    imported: importCsvFiles(files, await uploadedTemplates(formData)),
  }
}

async function uploadedTemplates(formData: FormData) {
  const files = formData.getAll('templates').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return []
  const parsed = await readTemplateFiles(
    await Promise.all(
      files.map(async (file) => ({ filename: file.name, data: await file.arrayBuffer() })),
    ),
  )
  return parsed.map((t) => ({ filename: t.filename, markdown: t.markdown }))
}

async function describe(
  filename: string,
  imported: ImportResult,
  formData: FormData,
): Promise<UploadReport> {
  const runId = String(formData.get('runId') ?? '')
  const config = imported.config

  const questions = [...config.questions.values()].flat()
  const blocks = [...config.blocks.values()].flat()

  // The diff is shown before anything is written, so the author sees the impact
  // of the import while they can still decide against it.
  let diff: ConfigDiff | undefined
  if (runId !== '') {
    const { configSnapshot, diffSnapshots } = await import('@/import/diff')
    diff = diffSnapshots(await previousSnapshot(runId).catch(() => undefined), configSnapshot(config))
  }

  return {
    ok: imported.usable,
    filename,
    issues: imported.issues,
    errorCount: imported.errors.length,
    warningCount: imported.warnings.length,
    repairs: config.repairs,
    chapters: config.chapters,
    counts: {
      characters: config.characters.length,
      questions: questions.length,
      answers: questions.reduce((n, q) => n + q.options.length, 0),
      blocks: blocks.length,
      variations: blocks.reduce((n, b) => n + b.variations.length, 0),
    },
    diff,
    coverage: imported.templates.length > 0 ? templateCoverage(config, imported.templates) : undefined,
    ignoredSheets: imported.ignoredSheets,
  }
}

/**
 * Snapshot of the newest stored version. Each version stores its own snapshot,
 * so the diff never depends on still having the old upload around.
 */
async function previousSnapshot(runId: string): Promise<EntitySnapshot[] | undefined> {
  if (runId === '') return undefined
  const versions = await listVersions(runId)
  const newest = versions[0]
  return (newest?.contentSnapshot as EntitySnapshot[] | null) ?? undefined
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

/** Version history for the admin screen. */
export async function listVersions(runId: string) {
  const run = forRun(runId)
  const rows = await run.select(configVersions)
  return rows.sort((a, b) => b.version - a.version)
}

export async function findVersion(runId: string, versionId: string) {
  const run = forRun(runId)
  const rows = await run.select(configVersions, eq(configVersions.id, versionId))
  return rows[0]
}
