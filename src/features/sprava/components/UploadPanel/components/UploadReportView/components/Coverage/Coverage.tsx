import type { TemplateCoverage } from '@/import'
import { common } from '@/locales/cs/common'
import { importReport } from '@/locales/cs/import_report'

/** Which character still has no template (§10.3). */
export const Coverage = ({ coverage }: { coverage: TemplateCoverage }) => (
  <div className="rounded border border-neutral-200 dark:border-neutral-800" data-testid="template-coverage">
    <div className="border-b border-inherit px-3 py-2">
      <h3 className="font-semibold">{importReport.templatesTitle}</h3>
      <p className="text-xs text-neutral-500">
        {coverage.missingCount === 0
          ? importReport.allTemplatesPresent
          : importReport.missingTemplates(coverage.missingCount)}
      </p>
    </div>
    <table className="w-full text-xs">
      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {coverage.assignments.map((row) => (
          <tr key={row.characterExternalId} data-testid={`template-coverage--${row.characterExternalId}`}>
            <td className="px-3 py-1.5">{row.characterName}</td>
            <td className="px-3 py-1.5 font-mono text-neutral-500">{row.expected || common.emptyValue}</td>
            <td
              className="px-3 py-1.5 data-[status=prirazena]:text-green-700 data-[status=chybi]:text-red-700 data-[status=nezadana]:text-red-700 dark:data-[status=prirazena]:text-green-400 dark:data-[status=chybi]:text-red-400 dark:data-[status=nezadana]:text-red-400"
              data-status={row.status}
            >
              {row.status === 'prirazena' && row.filename}
              {row.status === 'chybi' && importReport.templateMissing}
              {row.status === 'nezadana' && importReport.templateUnassigned}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {coverage.unmatched.length > 0 && (
      <p className="border-t border-inherit px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        {importReport.unmatchedTemplates(coverage.unmatched.map((template) => template.filename))}
      </p>
    )}
  </div>
)
