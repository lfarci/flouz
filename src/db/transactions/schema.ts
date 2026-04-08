import { Database } from 'bun:sqlite'

export function createTransactionsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      hash               TEXT NOT NULL UNIQUE,
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

export function createDuplicateTransactionsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS duplicate_transactions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      hash         TEXT NOT NULL,
      date         TEXT NOT NULL,
      amount       REAL NOT NULL,
      counterparty TEXT NOT NULL,
      note         TEXT,
      source_file  TEXT,
      detected_at  TEXT NOT NULL
    )
  `)
}