import { useCallback, useState } from 'react'

/** At most one version shows its check results at a time. */
export const useExpandedVersion = () => {
  const [expandedId, setExpandedId] = useState<string | undefined>()

  const toggle = useCallback((id: string) => setExpandedId((current) => (current === id ? undefined : id)), [])

  return { expandedId, toggle }
}
