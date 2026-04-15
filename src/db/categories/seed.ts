import { type Database } from 'bun:sqlite'
import { CATEGORIES } from '@/data/categories'

export function seedCategories(db: Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, slug, parent_id)
    VALUES ($id, $name, $slug, $parentId)
  `)

  for (const category of CATEGORIES) {
    insert.run({
      $id: category.id,
      $name: category.name,
      $slug: category.slug,
      $parentId: category.parentId,
    })
  }
}
