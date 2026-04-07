import { Database } from 'bun:sqlite'

export const TRANSACTION_DUPLICATE_DETECTION_KEY_COLUMNS = ['date', 'amount', 'counterparty'] as const

export function createTransactionsTable(db: Database): void {
  const duplicateDetectionKeySql = TRANSACTION_DUPLICATE_DETECTION_KEY_COLUMNS.join(', ')

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
      imported_at        TEXT NOT NULL,
      UNIQUE(${duplicateDetectionKeySql})
    )
  `)
}