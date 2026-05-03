import { type Database } from 'bun:sqlite'
import type { Category } from '@/types'

export function findCategoryIdBySlug(db: Database, slug: string): string {
  const row = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as { id: string } | null
  if (!row) throw new Error(`Category not found: ${slug}`)
  return row.id
}

export function getCategories(db: Database): Category[] {
  const rows = db
    .prepare('SELECT id, name, slug, parent_id FROM categories ORDER BY parent_id NULLS FIRST, name')
    .all() as Record<string, unknown>[]

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    parentId: (row.parent_id as string | null) ?? null,
  }))
}

export function collectDescendantIds(categories: Category[], rootId: string): string[] {
  const ids = [rootId]
  const children = categories.filter((category) => category.parentId === rootId)
  for (const child of children) {
    ids.push(...collectDescendantIds(categories, child.id))
  }
  return ids
}

export function findIncomeCategoryIds(categories: Category[]): string[] {
  const incomeRoot = categories.find((category) => category.slug === 'income')
  if (incomeRoot === undefined) return []
  return collectDescendantIds(categories, incomeRoot.id)
}
