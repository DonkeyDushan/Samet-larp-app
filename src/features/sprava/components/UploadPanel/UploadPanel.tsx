'use client'

/** Upload form and the report it produces (§10.2). */
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { AuthorField } from '@/components'
import { sprava } from '@/locales/cs/sprava'
import { UPLOAD_ACCEPT, UPLOAD_FIELDS } from '../../constants/upload-fields'
import { useUploadReport } from '../../hooks/useUploadReport'
import { UploadReportView } from './components/UploadReportView/UploadReportView'
import styles from './UploadPanel.module.css'

export const UploadPanel = ({ runId }: { runId: string }) => {
  const [author, setAuthor] = useState('')
  const { report, pending, canSave, handleCheck, handleSave } = useUploadReport()

  return (
    <Paper variant="outlined" component="section" className={styles.panel} data-testid="upload-panel">
      <Typography variant="h6" component="h2">
        {sprava.uploadTitle}
      </Typography>
      <Typography variant="body2" className={styles.hint}>
        {sprava.uploadHintBefore}
        <em>{sprava.uploadHintMenu}</em>
        {sprava.uploadHintMiddle}
        <code>{sprava.uploadHintFormat}</code>
        {sprava.uploadHintAfter}
      </Typography>

      <form className={styles.form} onSubmit={handleCheck} data-testid="upload-form">
        <input type="hidden" name={UPLOAD_FIELDS.runId} value={runId} />

        <label className={styles.fileField}>
          <Typography variant="subtitle2" component="span">
            {sprava.configLabel}
          </Typography>
          <input
            type="file"
            name={UPLOAD_FIELDS.config}
            accept={UPLOAD_ACCEPT.config}
            className={styles.fileInput}
            data-testid="upload-form--config"
          />
        </label>

        <label className={styles.fileField}>
          <Typography variant="subtitle2" component="span">
            {sprava.templatesLabel}
          </Typography>
          <input
            type="file"
            name={UPLOAD_FIELDS.templates}
            accept={UPLOAD_ACCEPT.templates}
            multiple
            className={styles.fileInput}
            data-testid="upload-form--templates"
          />
          <Typography variant="caption" component="span" className={styles.hint}>
            {sprava.templatesHint}
          </Typography>
        </label>

        <details className={styles.fallback}>
          <summary className={styles.fallbackSummary}>{sprava.csvFallbackSummary}</summary>
          <input
            type="file"
            name={UPLOAD_FIELDS.configCsv}
            accept={UPLOAD_ACCEPT.configCsv}
            multiple
            className={styles.fileInput}
            data-testid="upload-form--csv"
          />
          <Typography variant="caption" component="p" className={styles.hint}>
            {sprava.csvFallbackHint}
          </Typography>
        </details>

        <AuthorField
          name={UPLOAD_FIELDS.author}
          value={author}
          onChange={setAuthor}
          hint={sprava.authorHint}
          testId="upload-form--author"
        />

        <TextField
          name={UPLOAD_FIELDS.note}
          label={sprava.noteLabel}
          fullWidth
          slotProps={{ htmlInput: { 'data-testid': 'upload-form--note' } }}
        />

        <div className={styles.actions}>
          <Button type="submit" variant="contained" disabled={pending} data-testid="upload-form--check">
            {pending ? sprava.checking : sprava.check}
          </Button>
          <Button
            type="submit"
            variant="outlined"
            disabled={!canSave}
            formNoValidate
            onClick={handleSave}
            data-testid="upload-form--save"
          >
            {sprava.save}
          </Button>
        </div>
      </form>

      {report && <UploadReportView report={report} />}
    </Paper>
  )
}
