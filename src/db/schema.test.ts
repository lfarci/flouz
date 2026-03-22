import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { initDb, seedCategories } from './schema'
import { CATEGORIES } from '../data/categories'

describe('initDb', () => {
  it('creates categories table', () => {
    const db = new Database(':memory:')
    initDb(db)
    const row = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='categories'"
    ).get()
    expect(row?.name).toBe('categories')
  })

  it('creates transactions table', () => {
    const db = new Database(':memory:')
    initDb(db)
    const row = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    ).get()
    expect(row?.name).toBe('transactions')
  })

  it('is idempotent (safe to call twice)', () => {
    const db = new Database(':memory:')
    expect(() => {
      initDb(db)
      initDb(db)
    }).not.toThrow()
  })
})

describe('seedCategories', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
  })

  it('inserts all 24 categories', () => {
    seedCategories(db)
    const row = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM categories').get()
    expect(row?.count).toBe(24)
  })

  it('root categories have null parent_id', () => {
    seedCategories(db)
    const roots = db.query<{ id: string; parent_id: string | null }, []>(
      "SELECT id, parent_id FROM categories WHERE parent_id IS NULL"
    ).all()
    expect(roots.length).toBe(3)
    for (const root of roots) {
      expect(root.parent_id).toBeNull()
    }
  })

  it('L2 categories have valid parent_id', () => {
    seedCategories(db)
    const rootIds = CATEGORIES.filter(c => c.parentId === null).map(c => c.id)
    const l2 = CATEGORIES.filter(c => c.parentId !== null && rootIds.includes(c.parentId))
    for (const cat of l2) {
      const row = db.query<{ parent_id: string }, [string]>(
        'SELECT parent_id FROM categories WHERE id = ?'
      ).get(cat.id)
      expect(row?.parent_id).toBe(cat.parentId ?? undefined)
    }
  })

  it('L3 categories have valid parent_id', () => {
    seedCategories(db)
    const rootIds = new Set(CATEGORIES.filter(c => c.parentId === null).map(c => c.id))
    const l2Ids = new Set(CATEGORIES.filter(c => c.parentId !== null && rootIds.has(c.parentId!)).map(c => c.id))
    const l3 = CATEGORIES.filter(c => c.parentId !== null && l2Ids.has(c.parentId!))
    for (const cat of l3) {
      const row = db.query<{ parent_id: string }, [string]>(
        'SELECT parent_id FROM categories WHERE id = ?'
      ).get(cat.id)
      expect(row?.parent_id).toBe(cat.parentId ?? undefined)
    }
  })

  it('slugs are unique', () => {
    seedCategories(db)
    const rows = db.query<{ slug: string }, []>('SELECT slug FROM categories').all()
    const slugs = rows.map(r => r.slug)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
  })

  it('is idempotent (INSERT OR IGNORE)', () => {
    seedCategories(db)
    seedCategories(db)
    const row = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM categories').get()
    expect(row?.count).toBe(24)
  })
})
