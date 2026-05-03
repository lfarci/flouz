import { describe, it, expect } from 'bun:test'
import { monthDateRange } from './date-utils'

describe('monthDateRange', () => {
  it('returns start and end dates for a mid-year month', () => {
    const result = monthDateRange('2026-05')
    expect(result.startDate).toBe('2026-05-01')
    expect(result.endDate).toBe('2026-06-01')
  })

  it('returns start and end dates for January', () => {
    const result = monthDateRange('2026-01')
    expect(result.startDate).toBe('2026-01-01')
    expect(result.endDate).toBe('2026-02-01')
  })

  it('wraps December to January of the next year', () => {
    const result = monthDateRange('2026-12')
    expect(result.startDate).toBe('2026-12-01')
    expect(result.endDate).toBe('2027-01-01')
  })
})
