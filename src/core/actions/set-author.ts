'use server'

import { revalidatePath } from 'next/cache'
import { errors } from '@/locales/cs/errors'
import { readFormField } from '@/utils/read-form-field'
import { ACCESS_FIELDS } from '../constants/access'
import { HOME_ROUTE } from '../constants/routes'
import { writeAuthor } from '../services/auth-cookies'
import { DONE_FORM_STATE, failedFormState, type FormState } from '../types/form-state'
import { normalizeAuthor } from '../utils/normalize-author'

/** Changing the name mid-shift, when orgs hand the laptop over (§3.1). */
export const setAuthor = async (_previous: FormState, formData: FormData): Promise<FormState> => {
  const author = normalizeAuthor(readFormField(formData, ACCESS_FIELDS.author))
  if (!author) return failedFormState(errors.authorInvalid)

  await writeAuthor(author)
  // The name is shown in the header of every screen.
  revalidatePath(HOME_ROUTE, 'layout')

  return DONE_FORM_STATE
}
