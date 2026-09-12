'use server'

import { revalidatePath } from 'next/cache'
import { activateConfigVersion } from '@/import'
import { errors } from '@/locales/cs/errors'
import { SPRAVA_ROUTE } from '../constants/routes'

export interface ActivateVersionInput {
  runId: string
  versionId: string
  author: string
}

/** A new import never switches a running game by itself (§6.5); this does, into the audit. */
export const activateVersion = async ({ runId, versionId, author }: ActivateVersionInput): Promise<void> => {
  const name = author.trim()
  if (name === '') throw new Error(errors.authorRequiredForActivation)

  await activateConfigVersion(runId, versionId, name)
  revalidatePath(SPRAVA_ROUTE)
}
