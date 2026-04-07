import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb, seedCategories } from './schema'
import { getCategories } from './categories'

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  seedCategories(db)
})

describe('getCategories', () => {
  it('returns all 24 categories', () => {
    const cats = getCategories(db)
    expect(cats.length).toBe(24)
  })
})
