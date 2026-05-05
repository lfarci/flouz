import { describe, expect, it } from 'bun:test'
import { buildDefaultAllocation } from './budget-defaults'
import type { Category } from '@/types'

const baseCategories: Category[] = [
  { id: 'cat-1', name: 'Necessities', slug: 'necessities', parentId: null },
  { id: 'cat-2', name: 'Savings', slug: 'savings', parentId: null },
  { id: 'cat-3', name: 'Discretionary', slug: 'discretionary', parentId: null },
  { id: 'cat-4', name: 'Income', slug: 'income', parentId: null },
  { id: 'cat-5', name: 'Groceries', slug: 'groceries', parentId: 'cat-1' },
]

describe('buildDefaultAllocation', () => {
  const defaults = { necessities: '50%', discretionary: '30%', savings: '20%' }

  it('builds allocation for all three default categories', () => {
    const result = buildDefaultAllocation(baseCategories, defaults)
    expect(result).toHaveLength(3)
  })

  it('uses necessities option for the necessities category', () => {
    const result = buildDefaultAllocation(baseCategories, defaults)
    const necessities = result.find((entry) => entry.category.slug === 'necessities')
    expect(necessities?.parsed).toEqual({ amount: 50, type: 'percent' })
  })

  it('uses discretionary option for the discretionary category', () => {
    const result = buildDefaultAllocation(baseCategories, defaults)
    const discretionary = result.find((entry) => entry.category.slug === 'discretionary')
    expect(discretionary?.parsed).toEqual({ amount: 30, type: 'percent' })
  })

  it('uses savings option for the savings category', () => {
    const result = buildDefaultAllocation(baseCategories, defaults)
    const savings = result.find((entry) => entry.category.slug === 'savings')
    expect(savings?.parsed).toEqual({ amount: 20, type: 'percent' })
  })

  it('respects custom allocation values', () => {
    const custom = { necessities: '40%', discretionary: '25%', savings: '15%' }
    const result = buildDefaultAllocation(baseCategories, custom)
    const necessities = result.find((entry) => entry.category.slug === 'necessities')
    expect(necessities?.parsed).toEqual({ amount: 40, type: 'percent' })
  })

  it('throws for invalid allocation values', () => {
    const invalid = { necessities: '0%', discretionary: '30%', savings: '20%' }
    expect(() => buildDefaultAllocation(baseCategories, invalid)).toThrow('Invalid percentage')
  })
})
