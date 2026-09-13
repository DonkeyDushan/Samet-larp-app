import { errors } from '@/locales/cs/errors'
import { readFormField } from '@/utils/read-form-field'
import { RUN_FIELDS, RUN_LABEL_MAX_LENGTH } from '../constants/run-fields'

export type RunLabelInput = { _type: 'valid'; label: string | null } | { _type: 'invalid'; message: string }

/** An empty label is stored as `null`: the run then shows only its ID. */
export const readRunLabel = (formData: FormData): RunLabelInput => {
  const label = readFormField(formData, RUN_FIELDS.label).replace(/\s+/g, ' ').trim()
  if (label.length > RUN_LABEL_MAX_LENGTH) return { _type: 'invalid', message: errors.labelTooLong(RUN_LABEL_MAX_LENGTH) }

  return { _type: 'valid', label: label || null }
}
