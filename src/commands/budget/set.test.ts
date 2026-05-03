import { describe, expect, it } from 'bun:test'
import {
  parseBudgetValue,
  findTopLevelCategory,
  formatBudgetConfirmation,
} from './set'
import type { Category } from '@/types'

describe('parseBudgetValue', () => {
  it('parses a fixed EUR amount', () => {
    const result = parseBudgetValue('2000')
    expect(result).toEqual({ amount: 2000, type: 'fixed' })
  })

  it('parses a percentage value', () => {
    const result = parseBudgetValue('60%')
    expect(result).toEqual({ amount: 60, type: 'percent' })
  })

  it('parses decimal percentages', () => {
    const result = parseBudgetValue('33.5%')
    expect(result).toEqual({ amount: 33.5, type: 'percent' })
  })

  it('throws for 0%', () => {
    expect(() => parseBudgetValue('0%')).toThrow('Invalid percentage')
  })

  it('throws for percentages over 100', () => {
    expect(() => parseBudgetValue('101%')).toThrow('Invalid percentage')
  })

  it('throws for invalid percentage strings', () => {
    expect(() => parseBudgetValue('abc%')).toThrow('Invalid percentage')
  })

  it('throws for partially numeric percentage strings', () => {
    expect(() => parseBudgetValue('50abc%')).toThrow('Invalid percentage')
  })
})

describe('findTopLevelCategory', () => {
  const categories: Category[] = [
    { id: 'cat-1', name: 'Necessities', slug: 'necessities', parentId: null },
    { id: 'cat-2', name: 'Savings', slug: 'savings', parentId: null },
    { id: 'cat-3', name: 'Groceries', slug: 'groceries', parentId: 'cat-1' },
  ]

  it('returns the category when it is top-level', () => {
    const result = findTopLevelCategory(categories, 'necessities')
    expect(result.id).toBe('cat-1')
  })

  it('throws when category is not found', () => {
    expect(() => findTopLevelCategory(categories, 'unknown')).toThrow('Category not found')
  })

  it('throws when category is not top-level', () => {
    expect(() => findTopLevelCategory(categories, 'groceries')).toThrow(
      'Budgets can only be set on top-level categories',
    )
  })
})

describe('formatBudgetConfirmation', () => {
  it('formats a fixed budget confirmation', () => {
    const result = formatBudgetConfirmation('Necessities', { amount: 2000, type: 'fixed' }, '2026-05')
    expect(result).toContain('Necessities')
    expect(result).toContain('€2000.00')
    expect(result).toContain('2026-05')
  })

  it('formats a percent budget confirmation', () => {
    const result = formatBudgetConfirmation('Savings', { amount: 20, type: 'percent' }, '2026-05')
    expect(result).toContain('Savings')
    expect(result).toContain('20%')
    expect(result).toContain('2026-05')
  })
})
