import { Database } from 'bun:sqlite'
import { CATEGORIES } from '@/data/categories'

export function initDb(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      slug      TEXT NOT NULL,
      parent_id TEXT REFERENCES categories(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      date               TEXT NOT NULL,
      amount             REAL NOT NULL,
      counterparty       TEXT NOT NULL,
      counterparty_iban  TEXT,
      currency           TEXT DEFAULT 'EUR',
      account            TEXT,
      source_ref         TEXT,
      category_id        TEXT REFERENCES categories(id),
      ai_category_id     TEXT REFERENCES categories(id),
      ai_confidence      REAL,
      ai_reasoning       TEXT,
      note               TEXT,
      source_file        TEXT,
      imported_at        TEXT NOT NULL
    )
  `)
}

export function seedCategories(db: Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, slug, parent_id)
    VALUES ($id, $name, $slug, $parentId)
  `)

  for (const cat of CATEGORIES) {
    insert.run({ $id: cat.id, $name: cat.name, $slug: cat.slug, $parentId: cat.parentId })
  }
}

