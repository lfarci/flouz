import { Database } from 'bun:sqlite'

export function createCategoriesTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      slug      TEXT NOT NULL,
      parent_id TEXT REFERENCES categories(id)
    )
  `)
}