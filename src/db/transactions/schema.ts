import { Database } from 'bun:sqlite'

const HASH_INDEX = 'idx_transactions_hash'

export function createTransactionsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      date               TEXT NOT NULL,
      amount             REAL NOT NULL,
      counterparty       TEXT NOT NULL,
      hash               TEXT NOT NULL,
      counterparty_iban  TEXT,
      currency           TEXT DEFAULT 'EUR',
      account            TEXT,
      category_id        TEXT REFERENCES categories(id),
      note               TEXT,
      source_file        TEXT,
      imported_at        TEXT NOT NULL
    )
  `)

  createHashIndex(db)
}

function createHashIndex(db: Database): void {
  db.run(`CREATE INDEX IF NOT EXISTS ${HASH_INDEX} ON transactions (hash)`)
}