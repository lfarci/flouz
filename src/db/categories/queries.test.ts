import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { CATEGORIES } from '@/data/categories'
import { createCategoriesTable } from './schema'
import { collectDescendantIds, getCategories } from './queries'
import { seedCategories } from './seed'

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  createCategoriesTable(db)
  seedCategories(db)
})

describe('getCategories', () => {
  it('returns all categories', () => {
    const categories = getCategories(db)
    expect(categories.length).toBe(CATEGORIES.length)
  })
})

describe('collectDescendantIds', () => {
  it('returns only the root id when the category has no children', () => {
    const groceries = CATEGORIES.find((category) => category.slug === 'groceries')!

    const ids = collectDescendantIds(CATEGORIES, groceries.id)

    expect(ids).toEqual([groceries.id])
  })

  it('includes the category and all its direct children', () => {
    const transport = CATEGORIES.find((category) => category.slug === 'transport')!
    const transportChildren = CATEGORIES.filter((category) => category.parentId === transport.id)

    const ids = collectDescendantIds(CATEGORIES, transport.id)

    expect(ids).toContain(transport.id)
    for (const child of transportChildren) {
      expect(ids).toContain(child.id)
    }
  })

  it('includes grandchildren', () => {
    const discretionary = CATEGORIES.find((category) => category.slug === 'discretionary')!
    const restaurant = CATEGORIES.find((category) => category.slug === 'restaurant')!

    const ids = collectDescendantIds(CATEGORIES, discretionary.id)

    expect(ids).toContain(restaurant.id)
  })

  it('does not include unrelated categories', () => {
    const savings = CATEGORIES.find((category) => category.slug === 'savings')!
    const groceries = CATEGORIES.find((category) => category.slug === 'groceries')!

    const ids = collectDescendantIds(CATEGORIES, savings.id)

    expect(ids).not.toContain(groceries.id)
  })
})
