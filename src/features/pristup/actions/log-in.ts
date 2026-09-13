'use server'

import { redirect } from 'next/navigation'
import {
  ACCESS_FIELDS,
  accessToken,
  failedFormState,
  isValidAccessToken,
  LOGIN_FAILURE_DELAY_MS,
  normalizeAuthor,
  readAppPassword,
  safeReturnPath,
  type FormState,
} from '@/core'
import { writeAccessToken, writeAuthor } from '@/core/services/auth-cookies'
import { errors } from '@/locales/cs/errors'
import { delay } from '@/utils/delay'
import { readFormField } from '@/utils/read-form-field'

export const logIn = async (_previous: FormState, formData: FormData): Promise<FormState> => {
  const password = readAppPassword()
  if (!password) return failedFormState(errors.passwordNotConfigured)

  const author = normalizeAuthor(readFormField(formData, ACCESS_FIELDS.author))
  if (!author) return failedFormState(errors.authorInvalid)

  const token = await accessToken(readFormField(formData, ACCESS_FIELDS.password))
  if (!(await isValidAccessToken(token, password))) {
    await delay(LOGIN_FAILURE_DELAY_MS)

    return failedFormState(errors.wrongPassword)
  }

  await writeAccessToken(token)
  await writeAuthor(author)
  redirect(safeReturnPath(readFormField(formData, ACCESS_FIELDS.returnPath)))
}
