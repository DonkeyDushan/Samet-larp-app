import { common } from '@/locales/cs/common'
import { importReport } from '@/locales/cs/import_report'
import { CHAPTER_LIST_SEPARATOR } from '../../../../constants/report-format'
import type { UploadReport } from '../../../../types/upload-report'
import { buildRepairNotes } from '../../../../utils/build-repair-notes'
import { splitIssuesBySeverity } from '../../../../utils/split-issues'
import { Coverage } from './components/Coverage/Coverage'
import { DiffView } from './components/DiffView/DiffView'
import { IssueList } from './components/IssueList/IssueList'
import { Repairs } from './components/Repairs/Repairs'
import { Stat } from './components/Stat/Stat'

export const UploadReportView = ({ report }: { report: UploadReport }) => {
  const { errors, warnings } = splitIssuesBySeverity(report.issues)
  const repairNotes = report.repairs ? buildRepairNotes(report.repairs, report.ignoredSheets ?? []) : []

  return (
    <div
      className="mt-6 space-y-4 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800"
      data-testid="upload-report"
    >
      {report.failure && (
        <p className="rounded bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200" data-testid="upload-report--failure">
          {report.failure}
        </p>
      )}

      {report.filename !== '' && (
        <p data-testid="upload-report--verdict" data-usable={report.ok}>
          <strong>{report.filename}</strong>{' '}
          <span className="data-[usable=true]:text-green-700 data-[usable=false]:text-red-700 dark:data-[usable=true]:text-green-400 dark:data-[usable=false]:text-red-400" data-usable={report.ok}>
            {report.ok ? importReport.usable : importReport.unusable}
          </span>
        </p>
      )}

      {report.version !== undefined && (
        <p className="rounded bg-green-50 p-3 text-green-900 dark:bg-green-950 dark:text-green-100" data-testid="upload-report--saved">
          {report.alreadyImported ? importReport.alreadyImported(report.version) : importReport.saved(report.version)}
        </p>
      )}

      {report.counts && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3" data-testid="upload-report--counts">
          <Stat label={importReport.chapters} value={report.chapters?.join(CHAPTER_LIST_SEPARATOR) || common.emptyValue} />
          <Stat label={importReport.characters} value={report.counts.characters} />
          <Stat label={importReport.questions} value={report.counts.questions} />
          <Stat label={importReport.answers} value={report.counts.answers} />
          <Stat label={importReport.blocks} value={report.counts.blocks} />
          <Stat label={importReport.variations} value={report.counts.variations} />
        </dl>
      )}

      {repairNotes.length > 0 && <Repairs notes={repairNotes} />}

      {errors.length > 0 && (
        <IssueList
          title={importReport.errorsTitle(report.errorCount)}
          note={importReport.errorsNote}
          issues={errors}
          severity="chyba"
        />
      )}
      {warnings.length > 0 && (
        <IssueList
          title={importReport.warningsTitle(report.warningCount)}
          note={importReport.warningsNote}
          issues={warnings}
          severity="varovani"
        />
      )}

      {report.diff && <DiffView diff={report.diff} />}
      {report.coverage && <Coverage coverage={report.coverage} />}
    </div>
  )
}
