import { describe, expect, it } from 'bun:test'
import { formatBudgetTable, resolveCategoryName, formatBudgetAmount, toBudgetRows } from './list'
import { findIncomeCategoryIds } from '@/db/categories/queries'
import type { Budget, Category } from '@/types'

const categories: Category[] = [
  { id: 'cat-1', name: 'Necessities', slug: 'necessities', parentId: null },
  { id: 'cat-2', name: 'Savings', slug: 'savings', parentId: null },
]

describe('resolveCategoryName', () => {
  it('returns the category name when found', () => {
    expect(resolveCategoryName('cat-1', categories)).toBe('Necessities')
  })

  it('returns the category ID when not found', () => {
    expect(resolveCategoryName('unknown-id', categories)).toBe('unknown-id')
  })
})

describe('formatBudgetAmount', () => {
  it('formats a fixed budget with euro prefix and two decimals', () => {
    const budget: Budget = {
      id: 1,
      categoryId: 'cat-1',
      amount: 2000,
      type: 'fixed',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    }
    expect(formatBudgetAmount(budget, 0)).toBe('€2,000.00')
  })

  it('formats a percent budget with resolved amount and breakdown', () => {
    const budget: Budget = {
      id: 2,
      categoryId: 'cat-1',
      amount: 60,
      type: 'percent',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    }
    const result = formatBudgetAmount(budget, 3500)
    expect(result).toContain('€2,100.00')
    expect(result).toContain('60%')
    expect(result).toContain('€3,500')
  })

  it('shows no income data for percent budget with zero income', () => {
    const budget: Budget = {
      id: 3,
      categoryId: 'cat-1',
      amount: 20,
      type: 'percent',
      month: '2026-05',
      createdAt: '2026-05-01T00:00:00Z',
    }
    const result = formatBudgetAmount(budget, 0)
    expect(result).toContain('no income data')
    expect(result).toContain('20%')
  })
})

describe('toBudgetRows', () => {
  it('maps budgets to rows with category names and amounts', () => {
    const budgets: Budget[] = [
      { id: 1, categoryId: 'cat-1', amount: 2000, type: 'fixed', month: '2026-05', createdAt: '' },
      { id: 2, categoryId: 'cat-2', amount: 500, type: 'fixed', month: '2026-05', createdAt: '' },
    ]
    const rows = toBudgetRows(budgets, categories, 0)
    expect(rows).toHaveLength(2)
    expect(rows[0].categoryName).toBe('Necessities')
    expect(rows[0].amount).toBe('€2,000.00')
    expect(rows[1].categoryName).toBe('Savings')
    expect(rows[1].amount).toBe('€500.00')
  })
})

describe('formatBudgetTable', () => {
  it('renders a table with fixed budget rows', () => {
    const rows = [
      { categoryName: 'Necessities', amount: '€2,000.00' },
      { categoryName: 'Savings', amount: '€500.00' },
    ]

    const result = formatBudgetTable(rows)

    expect(result.length).toBeGreaterThan(0)
    const output = result.join('\n')
    expect(output).toContain('Category')
    expect(output).toContain('Monthly (€)')
    expect(output).toContain('Necessities')
    expect(output).toContain('€2,000.00')
    expect(output).toContain('Savings')
    expect(output).toContain('€500.00')
  })

  it('renders a table with percentage budget rows showing resolved amount', () => {
    const rows = [{ categoryName: 'Necessities', amount: '€2,100.00 (60% of €3,500)' }]

    const result = formatBudgetTable(rows)

    const output = result.join('\n')
    expect(output).toContain('60%')
    expect(output).toContain('€2,100.00')
  })

  it('renders percentage budget with no income data', () => {
    const rows = [{ categoryName: 'Savings', amount: '€0 (20% — no income data)' }]

    const result = formatBudgetTable(rows)

    const output = result.join('\n')
    expect(output).toContain('no income data')
  })

  it('returns an array of strings', () => {
    const rows = [{ categoryName: 'Discretionary', amount: '€800.00' }]

    const result = formatBudgetTable(rows)

    expect(Array.isArray(result)).toBe(true)
    for (const line of result) {
      expect(typeof line).toBe('string')
    }
  })
})

describe('findIncomeCategoryIds', () => {
  it('returns income category IDs when income category exists', () => {
    const categoriesWithIncome: Category[] = [
      { id: 'root-income', name: 'Income', slug: 'income', parentId: null },
      { id: 'salary', name: 'Salary', slug: 'salary', parentId: 'root-income' },
    ]
    const result = findIncomeCategoryIds(categoriesWithIncome)
    expect(result).toContain('root-income')
    expect(result).toContain('salary')
  })

  it('returns empty array when no income category exists', () => {
    expect(findIncomeCategoryIds(categories)).toEqual([])
  })
})
