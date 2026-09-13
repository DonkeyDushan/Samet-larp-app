export interface IssueFilterValues {
  query: string
  /** `ISSUE_FILTER_ALL` or a sheet name. */
  sheet: string
  /** `ISSUE_FILTER_ALL` or an `IssueCode`. */
  code: string
}

export interface IssueFacet<TValue extends string> {
  value: TValue
  count: number
}
