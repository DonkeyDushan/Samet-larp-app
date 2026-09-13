'use server'

import { revalidatePath } from 'next/cache'
import { DONE_FORM_STATE, failedFormState, HOME_ROUTE, type FormState } from '@/core'
import { readAuthor } from '@/core/services/auth-cookies'
import { renameRun } from '@/db'
import { errors } from '@/locales/cs/errors'
import { errorMessage } from '@/utils/error-message'
import { readFormField } from '@/utils/read-form-field'
import { RUN_FIELDS } from '../constants/run-fields'
import { readRunLabel } from '../utils/read-run-label'

export const renameRunAction = async (_previous: FormState, formData: FormData): Promise<FormState> => {
  const author = await readAuthor()
  if (author === '') return failedFormState(errors.authorInvalid)

  const label = readRunLabel(formData)
  if (label._type === 'invalid') return failedFormState(label.message)

  try {
    await renameRun({ runId: readFormField(formData, RUN_FIELDS.runId), label: label.label, author })
  } catch (cause) {
    return failedFormState(errorMessage(cause))
  }

  // The label shows in the run switcher of every screen.
  revalidatePath(HOME_ROUTE, 'layout')

  return DONE_FORM_STATE
}
