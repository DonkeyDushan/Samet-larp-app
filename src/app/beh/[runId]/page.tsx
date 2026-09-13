import { redirect } from 'next/navigation'
import { DEFAULT_RUN_SECTION, runRoute } from '@/core'

const RunPage = async ({ params }: { params: Promise<{ runId: string }> }) => {
  redirect(runRoute((await params).runId, DEFAULT_RUN_SECTION))
}

export default RunPage
