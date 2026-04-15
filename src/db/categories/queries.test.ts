import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { CATEGORIES } from '@/data/categories'
import { createCategoriesTable } from './schema'
import { getCategories } from './queries'
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
