import type { Sourced } from './sourced'
import type { IssueLocation } from './issue'

export interface ParsedCharacter extends Sourced {
  externalId: string
  firstName: string
  lastName: string
  groupName: string
  templateExternalId: string
  /** Starting values for chapter 1, keyed by scale key (§4.2). */
  initialScales: Record<string, { value: number; location: IssueLocation }>
}
