import { describe, expect, it } from 'bun:test'
import { validateMonth, currentMonth, parseAmount, parseBudgetValue, findTopLevelCategory } from './set'
import type { Category } from '@/types'

describe('validateMonth', () => {
  it('accepts valid YYYY-MM format', () => {
    expect(validateMonth('2026-05')).toBe(true)
    expect(validateMonth('2026-12')).toBe(true)
    expect(validateMonth('2025-01')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(validateMonth('2026-13')).toBe(false)
    expect(validateMonth('2026-00')).toBe(false)
    expect(validateMonth('202605')).toBe(false)
    expect(validateMonth('2026-5')).toBe(false)
    expect(validateMonth('May 2026')).toBe(false)
  })
})

describe('currentMonth', () => {
  it('returns a string matching YYYY-MM format', () => {
    const result = currentMonth()
    expect(result).toMatch(/^\d{4}-(?:0[1-9]|1[0-2])$/)
  })
})

describe('parseAmount', () => {
  it('parses a valid positive number', () => {
    expect(parseAmount('2000')).toBe(2000)
    expect(parseAmount('800.50')).toBe(800.5)
  })

  it('throws for zero', () => {
    expect(() => parseAmount('0')).toThrow('Invalid amount')
  })

  it('throws for negative numbers', () => {
    expect(() => parseAmount('-100')).toThrow('Invalid amount')
  })

  it('throws for non-numeric strings', () => {
    expect(() => parseAmount('abc')).toThrow('Invalid amount')
  })
})

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
    expect(() => findTopLevelCategory(categories, 'groceries')).toThrow('Budgets can only be set on top-level categories')
  })
})
