import { type Database } from 'bun:sqlite'

export function createBudgetsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id TEXT NOT NULL REFERENCES categories(id),
      amount      REAL NOT NULL CHECK(amount > 0),
      type        TEXT NOT NULL DEFAULT 'fixed' CHECK(type IN ('fixed', 'percent')),
      month       TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      UNIQUE(category_id, month),
      CHECK(type != 'percent' OR amount <= 100)
    )
  `)
}

export function createMonthlyIncomeTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_income (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      month      TEXT NOT NULL UNIQUE,
      amount     REAL NOT NULL CHECK(amount > 0),
      created_at TEXT NOT NULL
    )
  `)
}
