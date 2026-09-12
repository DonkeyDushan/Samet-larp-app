import { useCallback, useState, useTransition, type FormEvent, type MouseEvent } from 'react'
import { checkUpload } from '../actions/check-upload'
import { importUpload } from '../actions/import-upload'
import type { UploadReport } from '../types/upload-report'

/**
 * Checking is the primary action: the author uploads, reads the list, fixes the
 * sheet and repeats. Saving reuses the same form and stays disabled while the
 * last report has errors.
 */
export const useUploadReport = () => {
  const [report, setReport] = useState<UploadReport | undefined>()
  const [pending, startTransition] = useTransition()

  const canSave = !pending && (report === undefined || report.ok)

  const handleCheck = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    startTransition(async () => setReport(await checkUpload(data)))
  }, [])

  const handleSave = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const { form } = event.currentTarget
    if (!form) return

    const data = new FormData(form)
    startTransition(async () => setReport(await importUpload(data)))
  }, [])

  return { report, pending, canSave, handleCheck, handleSave }
}
