import type { IssueLocation } from './issue'

/** Every parsed record remembers where it came from, for error messages. */
export interface Sourced {
  location: IssueLocation
}
