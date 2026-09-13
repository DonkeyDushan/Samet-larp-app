import { archivedFileResponse } from '@/features/sprava'

interface ArchiveRouteContext {
  params: Promise<{ runId: string; fileId: string }>
}

export const GET = async (_request: Request, { params }: ArchiveRouteContext) => {
  const { runId, fileId } = await params

  return archivedFileResponse(runId, fileId)
}
