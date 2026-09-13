import { describe, expect, it } from 'vitest'
import { accessToken, constantTimeEqual, isValidAccessToken } from './services/access-token'
import { isCalendarDate, todayIsoDate } from './utils/calendar-date'
import { nextRunLetter, type RunLetterUse } from './utils/next-run-letter'
import { normalizeAuthor } from './utils/normalize-author'
import { safeReturnPath } from './utils/safe-return-path'

describe('nextRunLetter', () => {
  it('starts at A', () => {
    expect(nextRunLetter([], '2026-09-12')).toBe('A')
  })

  it('takes B and C for further runs on the same date', () => {
    const existing: RunLetterUse[] = [
      { startDate: '2026-09-12', letter: 'A' },
      { startDate: '2026-09-12', letter: 'B' },
    ]
    expect(nextRunLetter(existing, '2026-09-12')).toBe('C')
  })

  it('restarts at A for a new date', () => {
    const existing: RunLetterUse[] = [
      { startDate: '2026-09-12', letter: 'A' },
      { startDate: '2026-09-12', letter: 'B' },
    ]
    expect(nextRunLetter(existing, '2026-09-19')).toBe('A')
  })

  it('fills a gap left on the same date', () => {
    const existing: RunLetterUse[] = [{ startDate: '2026-09-12', letter: 'B' }]
    expect(nextRunLetter(existing, '2026-09-12')).toBe('A')
  })

  it('has no letter left after Z', () => {
    const existing: RunLetterUse[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => ({ startDate: '2026-09-12', letter }))
    expect(nextRunLetter(existing, '2026-09-12')).toBeUndefined()
  })
})

describe('safeReturnPath', () => {
  it.each([
    ['/beh/2026-09-12_A/sprava', '/beh/2026-09-12_A/sprava'],
    ['/?x=1', '/?x=1'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    ['', '/'],
    [null, '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeReturnPath(input)).toBe(expected)
  })
})

describe('access token', () => {
  it('accepts the cookie of the configured password only', async () => {
    const token = await accessToken('heslo')
    expect(await isValidAccessToken(token, 'heslo')).toBe(true)
    expect(await isValidAccessToken(token, 'jine-heslo')).toBe(false)
    expect(await isValidAccessToken(token, undefined)).toBe(false)
    expect(await isValidAccessToken(undefined, 'heslo')).toBe(false)
  })

  it('does not store the password in the cookie', async () => {
    expect(await accessToken('heslo')).not.toContain('heslo')
  })

  it('compares strings of different length as unequal', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
  })
})

describe('calendar date', () => {
  it.each([
    ['2026-09-12', true],
    ['2026-02-29', false],
    ['2028-02-29', true],
    ['2026-13-01', false],
    ['12. 9. 2026', false],
  ])('%s is %s', (value, expected) => {
    expect(isCalendarDate(value)).toBe(expected)
  })

  it('takes today in Prague, not in UTC', () => {
    expect(todayIsoDate(new Date('2026-09-12T22:30:00Z'))).toBe('2026-09-13')
  })
})

describe('normalizeAuthor', () => {
  it('trims and collapses whitespace, keeps diacritics', () => {
    expect(normalizeAuthor('  Natálie   S. ')).toBe('Natálie S.')
  })

  it('refuses an empty name', () => {
    expect(normalizeAuthor('   ')).toBeUndefined()
  })
})
