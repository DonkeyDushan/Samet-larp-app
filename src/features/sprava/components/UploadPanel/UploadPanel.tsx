'use client'

/** Upload form and the report it produces (§10.2). */
import { useState } from 'react'
import { AuthorField } from '@/components'
import { sprava } from '@/locales/cs/sprava'
import { UPLOAD_ACCEPT, UPLOAD_FIELDS } from '../../constants/upload-fields'
import { useUploadReport } from '../../hooks/useUploadReport'
import { UploadReportView } from './components/UploadReportView/UploadReportView'

interface UploadPanelProps {
  runId: string
  accentClassName: string
}

const INPUT_CLASS = 'mt-1 block w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800'

export const UploadPanel = ({ runId, accentClassName }: UploadPanelProps) => {
  const [author, setAuthor] = useState('')
  const { report, pending, canSave, handleCheck, handleSave } = useUploadReport()

  return (
    <section
      className={`rounded border-l-4 ${accentClassName} bg-neutral-50 p-4 dark:bg-neutral-900`}
      data-testid="upload-panel"
    >
      <h2 className="text-base font-semibold">{sprava.uploadTitle}</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {sprava.uploadHintBefore}
        <em>{sprava.uploadHintMenu}</em>
        {sprava.uploadHintMiddle}
        <code>{sprava.uploadHintFormat}</code>
        {sprava.uploadHintAfter}
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleCheck} data-testid="upload-form">
        <input type="hidden" name={UPLOAD_FIELDS.runId} value={runId} />

        <label className="block text-sm">
          <span className="font-medium">{sprava.configLabel}</span>
          <input
            type="file"
            name={UPLOAD_FIELDS.config}
            accept={UPLOAD_ACCEPT.config}
            className="mt-1 block w-full text-sm"
            data-testid="upload-form--config"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">{sprava.templatesLabel}</span>
          <input
            type="file"
            name={UPLOAD_FIELDS.templates}
            accept={UPLOAD_ACCEPT.templates}
            multiple
            className="mt-1 block w-full text-sm"
            data-testid="upload-form--templates"
          />
          <span className="mt-1 block text-xs text-neutral-500">{sprava.templatesHint}</span>
        </label>

        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">{sprava.csvFallbackSummary}</summary>
          <input
            type="file"
            name={UPLOAD_FIELDS.configCsv}
            accept={UPLOAD_ACCEPT.configCsv}
            multiple
            className="mt-2 block w-full text-sm"
            data-testid="upload-form--csv"
          />
          <p className="mt-1 text-xs text-neutral-500">{sprava.csvFallbackHint}</p>
        </details>

        <AuthorField
          name={UPLOAD_FIELDS.author}
          value={author}
          onChange={setAuthor}
          hint={sprava.authorHint}
          testId="upload-form--author"
        />

        <label className="block text-sm">
          <span className="font-medium">{sprava.noteLabel}</span>
          <input name={UPLOAD_FIELDS.note} className={INPUT_CLASS} data-testid="upload-form--note" />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900"
            data-testid="upload-form--check"
          >
            {pending ? sprava.checking : sprava.check}
          </button>
          <button
            type="submit"
            disabled={!canSave}
            formNoValidate
            onClick={handleSave}
            className="rounded border border-neutral-400 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-neutral-600"
            data-testid="upload-form--save"
          >
            {sprava.save}
          </button>
        </div>
      </form>

      {report && <UploadReportView report={report} />}
    </section>
  )
}
