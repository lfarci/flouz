import { type Database } from 'bun:sqlite'

const ACCOUNT_DATE_INDEX = 'idx_account_balance_snapshots_account_date'

export function createAccountBalanceSnapshotsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS account_balance_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      date        TEXT NOT NULL,
      amount      REAL NOT NULL,
      currency    TEXT NOT NULL DEFAULT 'EUR' CHECK(length(currency) > 0),
      note        TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      UNIQUE(account_id, date),
      CHECK(length(date) = 10)
    )
  `)

  createAccountDateIndex(db)
}

function createAccountDateIndex(db: Database): void {
  db.run(`CREATE INDEX IF NOT EXISTS ${ACCOUNT_DATE_INDEX} ON account_balance_snapshots (account_id, date)`)
}
