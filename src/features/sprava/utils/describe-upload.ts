import { templateCoverage, type ParsedConfig } from '@/import'
import type { UploadCounts, UploadReport } from '../types/upload-report'
import type { ParsedUpload } from './parse-upload'

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

export const describeUpload = ({ filename, imported }: ParsedUpload): UploadReport => {
  const { config } = imported

  return {
    ok: imported.usable,
    filename,
    issues: imported.issues,
    errorCount: imported.errors.length,
    warningCount: imported.warnings.length,
    repairs: config.repairs,
    chapters: config.chapters,
    counts: countEntities(config),
    coverage: imported.templates.length > 0 ? templateCoverage(config, imported.templates) : undefined,
    ignoredSheets: imported.ignoredSheets,
  }
}
