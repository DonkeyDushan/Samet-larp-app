import { forRun } from '@/db'
import { configVersions } from '@/db/schema'
import {
  configSnapshot,
  diffSnapshots,
  newestSnapshot,
  templateCoverage,
  type ConfigDiff,
  type EntitySnapshot,
  type ParsedConfig,
} from '@/import'
import type { UploadCounts, UploadReport } from '../types/upload-report'
import type { ParsedUpload } from './parse-upload'

/** Each version stores its own snapshot, so the diff never needs the old upload. */
const previousSnapshot = async (runId: string): Promise<EntitySnapshot[] | undefined> =>
  newestSnapshot(await forRun(runId).select(configVersions))

const countEntities = (config: ParsedConfig): UploadCounts => {
  const counts: UploadCounts = { characters: config.characters.length, questions: 0, answers: 0, blocks: 0, variations: 0 }

  for (const questions of config.questions.values()) {
    counts.questions += questions.length
    for (const question of questions) counts.answers += question.options.length
  }
  for (const blocks of config.blocks.values()) {
    counts.blocks += blocks.length
    for (const block of blocks) counts.variations += block.variations.length
  }

  return counts
}

export const describeUpload = async ({ filename, imported }: ParsedUpload, runId: string): Promise<UploadReport> => {
  const { config } = imported

  // Shown before anything is written, so the author sees the impact of the
  // import while they can still decide against it.
  let diff: ConfigDiff | undefined
  if (runId !== '') {
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
    counts: countEntities(config),
    diff,
    coverage: imported.templates.length > 0 ? templateCoverage(config, imported.templates) : undefined,
    ignoredSheets: imported.ignoredSheets,
  }
}
