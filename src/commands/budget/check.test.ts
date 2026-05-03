import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  daysInMonth,
  dayOfMonth,
  resolveElapsedDay,
  monthElapsedPercentage,
  renderProgressBar,
  selectColor,
  projectedSpending,
  computeSpentPercentage,
  computeProgress,
  formatEuro,
  formatEuroDecimal,
  renderHeader,
  renderProgressRow,
  renderTotalRow,
  renderRecentTransactions,
  renderPaceWarning,
  isCurrentMonth,
} from './check'
import { currentMonth } from './set'
import type { Budget, Transaction } from '@/types'

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
    originalNoColor = process.env.NO_COLOR
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

describe('computeSpentPercentage', () => {
  it('returns percentage of budget spent', () => {
    expect(computeSpentPercentage(500, 1000)).toBe(50)
  })

  it('returns 100 when spent exceeds zero budget and spending exists', () => {
    expect(computeSpentPercentage(100, 0)).toBe(100)
  })

  it('returns 0 when both spent and budget are zero', () => {
    expect(computeSpentPercentage(0, 0)).toBe(0)
  })

  it('returns over 100 when overspending', () => {
    expect(computeSpentPercentage(1500, 1000)).toBe(150)
  })
})

describe('computeProgress', () => {
  const fixedBudget: Budget = {
    id: 1,
    categoryId: 'cat-1',
    amount: 1000,
    type: 'fixed',
    month: '2026-05',
    createdAt: '2026-05-01T00:00:00Z',
  }

  const percentBudget: Budget = {
    id: 2,
    categoryId: 'cat-2',
    amount: 50,
    type: 'percent',
    month: '2026-05',
    createdAt: '2026-05-01T00:00:00Z',
  }

  it('computes progress for a fixed budget', () => {
    const result = computeProgress(fixedBudget, 'Necessities', -600, 0)
    expect(result.categoryName).toBe('Necessities')
    expect(result.budgetAmount).toBe(1000)
    expect(result.spent).toBe(600)
    expect(result.remaining).toBe(400)
    expect(result.percentage).toBe(60)
    expect(result.incomeAvailable).toBe(true)
  })

  it('computes progress for a percent budget with income', () => {
    const result = computeProgress(percentBudget, 'Savings', -250, 2000)
    expect(result.budgetAmount).toBe(1000)
    expect(result.spent).toBe(250)
    expect(result.remaining).toBe(750)
    expect(result.percentage).toBe(25)
    expect(result.incomeAvailable).toBe(true)
  })

  it('marks income unavailable for percent budget with zero income', () => {
    const result = computeProgress(percentBudget, 'Savings', -100, 0)
    expect(result.incomeAvailable).toBe(false)
    expect(result.budgetAmount).toBe(0)
    expect(result.spent).toBe(100)
    expect(result.percentage).toBe(100)
  })

  it('shows negative remaining when over budget', () => {
    const result = computeProgress(fixedBudget, 'Necessities', -1500, 0)
    expect(result.remaining).toBe(-500)
    expect(result.percentage).toBe(150)
  })
})

describe('formatEuro', () => {
  it('formats a whole number with two decimals', () => {
    expect(formatEuro(1000)).toBe('€1,000.00')
  })

  it('formats a decimal amount', () => {
    expect(formatEuro(42.5)).toBe('€42.50')
  })

  it('formats zero', () => {
    expect(formatEuro(0)).toBe('€0.00')
  })

  it('formats negative amounts', () => {
    expect(formatEuro(-500)).toBe('€-500.00')
  })
})

describe('renderHeader', () => {
  it('includes month name, day info, and spending', () => {
    const result = renderHeader('2026-05', 15, 31, 800)
    expect(result).toContain('May')
    expect(result).toContain('2026')
    expect(result).toContain('day 15 of 31')
    expect(result).toContain('€800.00')
  })
})

describe('renderTotalRow', () => {
  it('shows budget, spent, remaining, and percentage', () => {
    const result = renderTotalRow(2000, 1200)
    expect(result).toContain('Total')
    expect(result).toContain('€2,000.00')
    expect(result).toContain('€1,200.00')
    expect(result).toContain('€800.00')
    expect(result).toContain('60% of budget used')
  })

  it('shows negative remaining when over budget', () => {
    const result = renderTotalRow(1000, 1500)
    expect(result).toContain('€-500.00')
    expect(result).toContain('150% of budget used')
  })

  it('shows 0% when budget is zero', () => {
    const result = renderTotalRow(0, 0)
    expect(result).toContain('0% of budget used')
  })
})

describe('renderPaceWarning', () => {
  it('shows projected spending and budget', () => {
    const result = renderPaceWarning(300, 10, 30, 1000)
    expect(result).toContain('At this pace')
    expect(result).toContain('€1,000.00')
  })

  it('shows warning icon when projected exceeds budget', () => {
    const result = renderPaceWarning(600, 10, 30, 1000)
    expect(result).toContain('⚠')
  })

  it('does not show warning when under budget', () => {
    const result = renderPaceWarning(200, 10, 30, 1000)
    expect(result).not.toContain('⚠')
  })
})

describe('formatEuroDecimal', () => {
  it('formats a positive amount with two decimals', () => {
    expect(formatEuroDecimal(42.5)).toBe('€42.50')
  })

  it('formats a negative amount as absolute value', () => {
    expect(formatEuroDecimal(-100.99)).toBe('€100.99')
  })
})

describe('renderProgressRow', () => {
  beforeEach(() => {
    process.env.NO_COLOR = '1'
  })

  afterEach(() => {
    delete process.env.NO_COLOR
  })

  it('renders a normal budget row', () => {
    const progress = {
      categoryName: 'Necessities',
      budgetAmount: 2000,
      spent: 1000,
      remaining: 1000,
      percentage: 50,
      incomeAvailable: true,
    }
    const result = renderProgressRow(progress, 50)
    expect(result).toContain('Necessities')
    expect(result).toContain('€2,000.00')
    expect(result).toContain('€1,000.00')
    expect(result).toContain('50%')
    expect(result).toContain('✓')
  })

  it('renders warning icon when over budget', () => {
    const progress = {
      categoryName: 'Food',
      budgetAmount: 500,
      spent: 600,
      remaining: -100,
      percentage: 120,
      incomeAvailable: true,
    }
    const result = renderProgressRow(progress, 50)
    expect(result).toContain('⚠')
  })

  it('renders no income data message when income unavailable', () => {
    const progress = {
      categoryName: 'Savings',
      budgetAmount: 0,
      spent: 200,
      remaining: -200,
      percentage: 100,
      incomeAvailable: false,
    }
    const result = renderProgressRow(progress, 50)
    expect(result).toContain('no income data')
    expect(result).toContain('€200.00')
  })
})

describe('renderRecentTransactions', () => {
  it('returns empty string when no transactions', () => {
    expect(renderRecentTransactions([])).toBe('')
  })

  it('renders transaction rows with header', () => {
    const transactions: Transaction[] = [
      {
        date: '2026-05-01',
        amount: -42.5,
        counterparty: 'ACME Shop',
        currency: 'EUR',
        importedAt: '',
        hash: '',
      },
    ]
    const result = renderRecentTransactions(transactions)
    expect(result).toContain('RECENT TRANSACTIONS')
    expect(result).toContain('ACME Shop')
    expect(result).toContain('€42.50')
  })

  it('limits to 10 transactions', () => {
    const transactions: Transaction[] = Array.from({ length: 15 }, (_, index) => ({
      date: '2026-05-01',
      amount: -10,
      counterparty: `Merchant ${index}`,
      currency: 'EUR',
      importedAt: '',
      hash: '',
    }))
    const result = renderRecentTransactions(transactions)
    expect(result).toContain('Merchant 9')
    expect(result).not.toContain('Merchant 10')
  })
})

describe('isCurrentMonth', () => {
  it('returns true for the current month', () => {
    expect(isCurrentMonth(currentMonth())).toBe(true)
  })

  it('returns false for a past month', () => {
    expect(isCurrentMonth('2020-01')).toBe(false)
  })
})

describe('selectColor with colors enabled', () => {
  beforeEach(() => {
    delete process.env.NO_COLOR
  })

  afterEach(() => {
    process.env.NO_COLOR = '1'
  })

  it('returns red ANSI code when over 100%', () => {
    expect(selectColor(110, 50)).toBe('\x1b[31m')
  })

  it('returns yellow ANSI code when ahead of pace', () => {
    expect(selectColor(60, 40)).toBe('\x1b[33m')
  })

  it('returns green ANSI code when on track', () => {
    expect(selectColor(30, 50)).toBe('\x1b[32m')
  })
})
