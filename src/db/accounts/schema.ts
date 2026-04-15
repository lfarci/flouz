import { type Database } from 'bun:sqlite'

const ACCOUNTS_KEY_INDEX = 'idx_accounts_key'

export function createAccountsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      key          TEXT NOT NULL UNIQUE,
      company      TEXT NOT NULL,
      name         TEXT NOT NULL,
      description  TEXT,
      iban         TEXT
    )
  `)

  createAccountsKeyIndex(db)
}

function createAccountsKeyIndex(db: Database): void {
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${ACCOUNTS_KEY_INDEX} ON accounts (key)`,
  )
}
