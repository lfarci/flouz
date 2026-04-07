import { Database } from 'bun:sqlite'
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
