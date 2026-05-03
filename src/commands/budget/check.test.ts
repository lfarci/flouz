import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  daysInMonth,
  dayOfMonth,
  resolveElapsedDay,
  monthElapsedPercentage,
  renderProgressBar,
  selectColor,
  projectedSpending,
} from './check'
import { currentMonth } from './set'

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth('2026-01')).toBe(31)
  })

  it('returns 28 for February in non-leap year', () => {
    expect(daysInMonth('2025-02')).toBe(28)
  })

  it('returns 29 for February in leap year', () => {
    expect(daysInMonth('2024-02')).toBe(29)
  })

  it('returns 30 for April', () => {
    expect(daysInMonth('2026-04')).toBe(30)
  })
})

describe('dayOfMonth', () => {
  it('returns the correct day number', () => {
    expect(dayOfMonth(new Date('2026-05-15'))).toBe(15)
    expect(dayOfMonth(new Date('2026-05-01'))).toBe(1)
  })
})

describe('resolveElapsedDay', () => {
  it('returns total days for a past month', () => {
    const result = resolveElapsedDay('2020-01')
    expect(result).toBe(31)
  })

  it('returns 0 for a future month', () => {
    const result = resolveElapsedDay('2099-12')
    expect(result).toBe(0)
  })

  it('returns a day within range for the current month', () => {
    const result = resolveElapsedDay(currentMonth())
    const totalDays = daysInMonth(currentMonth())
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThanOrEqual(totalDays)
  })
})

describe('monthElapsedPercentage', () => {
  it('returns 0 at start of month', () => {
    expect(monthElapsedPercentage(0, 31)).toBe(0)
  })

  it('returns 100 at end of month', () => {
    expect(monthElapsedPercentage(31, 31)).toBe(100)
  })

  it('returns approximately 50 at midpoint', () => {
    const result = monthElapsedPercentage(15, 30)
    expect(result).toBe(50)
  })
})

describe('renderProgressBar', () => {
  it('renders empty bar at 0%', () => {
    expect(renderProgressBar(0, 10)).toBe('░░░░░░░░░░')
  })

  it('renders full bar at 100%', () => {
    expect(renderProgressBar(100, 10)).toBe('▓▓▓▓▓▓▓▓▓▓')
  })

  it('renders partial bar at 50%', () => {
    expect(renderProgressBar(50, 10)).toBe('▓▓▓▓▓░░░░░')
  })

  it('caps at full bar when over 100%', () => {
    expect(renderProgressBar(150, 10)).toBe('▓▓▓▓▓▓▓▓▓▓')
  })
})

describe('selectColor', () => {
  let originalNoColor: string | undefined

  beforeEach(() => {
    originalNoColor = Bun.env.NO_COLOR
    delete process.env.NO_COLOR
  })

  afterEach(() => {
    if (originalNoColor !== undefined) {
      process.env.NO_COLOR = originalNoColor
    } else {
      delete process.env.NO_COLOR
    }
  })

  it('returns empty string when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1'
    expect(selectColor(20, 50)).toBe('')
    expect(selectColor(60, 50)).toBe('')
    expect(selectColor(110, 50)).toBe('')
  })
})

describe('projectedSpending', () => {
  it('projects spending linearly over the month', () => {
    expect(projectedSpending(300, 10, 30)).toBe(900)
  })

  it('returns spent amount when day is 0', () => {
    expect(projectedSpending(0, 0, 31)).toBe(0)
  })

  it('handles exact end of month', () => {
    expect(projectedSpending(1000, 31, 31)).toBe(1000)
  })
})
