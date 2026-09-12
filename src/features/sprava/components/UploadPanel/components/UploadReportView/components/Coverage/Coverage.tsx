import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { TitledPanel } from '@/components'
import type { TemplateCoverage } from '@/import'
import { common } from '@/locales/cs/common'
import { importReport } from '@/locales/cs/import_report'
import styles from './Coverage.module.css'

/** Which character still has no template (§10.3). */
export const Coverage = ({ coverage }: { coverage: TemplateCoverage }) => (
  <TitledPanel
    title={importReport.templatesTitle}
    note={
      coverage.missingCount === 0
        ? importReport.allTemplatesPresent
        : importReport.missingTemplates(coverage.missingCount)
    }
    testId="template-coverage"
  >
    <Table size="small">
      <TableBody>
        {coverage.assignments.map((row) => (
          <TableRow key={row.characterExternalId} data-testid={`template-coverage--${row.characterExternalId}`}>
            <TableCell>{row.characterName}</TableCell>
            <TableCell>
              <code className={styles.expected}>{row.expected || common.emptyValue}</code>
            </TableCell>
            <TableCell className={styles.status} data-status={row.status}>
              {row.status === 'prirazena' && row.filename}
              {row.status === 'chybi' && importReport.templateMissing}
              {row.status === 'nezadana' && importReport.templateUnassigned}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {coverage.unmatched.length > 0 && (
      <Typography variant="caption" component="p" className={styles.unmatched}>
        {importReport.unmatchedTemplates(coverage.unmatched.map((template) => template.filename))}
      </Typography>
    )}
  </TitledPanel>
)
