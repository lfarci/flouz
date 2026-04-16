import { type Database } from 'bun:sqlite'

export function createTransactionCategorySuggestionsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_category_suggestions (
      transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
      category_id    TEXT NOT NULL REFERENCES categories(id),
      confidence     REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
      model          TEXT NOT NULL,
      suggested_at   TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','applied')),
      reviewed_at    TEXT,
      applied_at     TEXT
    )
  `)
}

export function migrateTransactionCategorySuggestionsTable(db: Database): void {
  const columns = db.prepare(
    'PRAGMA table_info(transaction_category_suggestions)'
  ).all() as { name: string }[]

  const names = new Set(columns.map(c => c.name))

  if (!names.has('status')) {
    db.run(
      "ALTER TABLE transaction_category_suggestions ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','applied'))"
    )
  }
  if (!names.has('reviewed_at')) {
    db.run('ALTER TABLE transaction_category_suggestions ADD COLUMN reviewed_at TEXT')
  }
  if (!names.has('applied_at')) {
    db.run('ALTER TABLE transaction_category_suggestions ADD COLUMN applied_at TEXT')
  }
}
