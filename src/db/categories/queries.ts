import { type Database } from 'bun:sqlite'
import type { Category } from '@/types'

export function getCategories(db: Database): Category[] {
  const rows = db.prepare(
    'SELECT id, name, slug, parent_id FROM categories ORDER BY parent_id NULLS FIRST, name'
  ).all() as Record<string, unknown>[]

  return rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    parentId: (row.parent_id as string | null) ?? null,
  }))
}

export function findCategoryIdBySlug(db: Database, slug: string): string {
  const categories = getCategories(db)
  const match = categories.find(category => category.slug === slug)
  if (match !== undefined) return match.id
  const known = categories.map(category => category.slug).join(', ')
  throw new Error(`Unknown category slug: "${slug}". Known slugs: ${known}`)
}