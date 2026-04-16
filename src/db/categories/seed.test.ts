import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { CATEGORIES } from '@/data/categories'
import { createCategoriesTable } from './schema'
import { seedCategories } from './seed'

describe('seedCategories', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    createCategoriesTable(db)
  })

  it('inserts all 24 categories', () => {
    seedCategories(db)
    const row = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM categories').get()
    expect(row?.count).toBe(24)
  })

  it('root categories have null parent_id', () => {
    seedCategories(db)
    const roots = db
      .query<
        { id: string; parent_id: string | null },
        []
      >('SELECT id, parent_id FROM categories WHERE parent_id IS NULL')
      .all()
    expect(roots.length).toBe(3)
    for (const root of roots) {
      expect(root.parent_id).toBeNull()
    }
  })

  it('L2 categories have valid parent_id', () => {
    seedCategories(db)
    const rootIds = CATEGORIES.filter((category) => category.parentId === null).map((category) => category.id)
    const l2Categories = CATEGORIES.filter(
      (category) => category.parentId !== null && rootIds.includes(category.parentId),
    )

    for (const category of l2Categories) {
      const row = db
        .query<{ parent_id: string }, [string]>('SELECT parent_id FROM categories WHERE id = ?')
        .get(category.id)
      expect(row?.parent_id).toBe(category.parentId ?? undefined)
    }
  })

  it('L3 categories have valid parent_id', () => {
    seedCategories(db)
    const rootIds = new Set(CATEGORIES.filter((category) => category.parentId === null).map((category) => category.id))
    const l2Ids = new Set(
      CATEGORIES.filter((category) => category.parentId !== null && rootIds.has(category.parentId)).map(
        (category) => category.id,
      ),
    )
    const l3Categories = CATEGORIES.filter((category) => category.parentId !== null && l2Ids.has(category.parentId))

    for (const category of l3Categories) {
      const row = db
        .query<{ parent_id: string }, [string]>('SELECT parent_id FROM categories WHERE id = ?')
        .get(category.id)
      expect(row?.parent_id).toBe(category.parentId ?? undefined)
    }
  })

  it('slugs are unique', () => {
    seedCategories(db)
    const rows = db.query<{ slug: string }, []>('SELECT slug FROM categories').all()
    const slugs = rows.map((row) => row.slug)
    const uniqueSlugs = new Set(slugs)
    expect(uniqueSlugs.size).toBe(slugs.length)
  })

  it('is idempotent (INSERT OR IGNORE)', () => {
    seedCategories(db)
    seedCategories(db)
    const row = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM categories').get()
    expect(row?.count).toBe(24)
  })
})
