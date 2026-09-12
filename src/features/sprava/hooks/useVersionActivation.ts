import { useCallback, useState, useTransition } from 'react'
import { activateVersion } from '../actions/activate-version'

export const useVersionActivation = (runId: string) => {
  const [author, setAuthor] = useState('')
  const [pending, startTransition] = useTransition()

  const hasAuthor = author.trim() !== ''

  const activate = useCallback(
    (versionId: string) => startTransition(() => activateVersion({ runId, versionId, author })),
    [runId, author],
  )

  return { author, setAuthor, hasAuthor, pending, activate }
}
