import { type Database } from 'bun:sqlite'

export function createTransactionCategorySuggestionsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_category_suggestions (
      transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
      category_id    TEXT NOT NULL REFERENCES categories(id),
      confidence     REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
      model          TEXT NOT NULL,
      suggested_at   TEXT NOT NULL
    )
  `)
}
