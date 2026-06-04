import { Database } from 'bun:sqlite'
import { createAccountBalanceSnapshotsTable } from '@/db/account_balance_snapshots/schema'
import { createAccountsTable } from '@/db/accounts/schema'
import { createBudgetsTable, createMonthlyIncomeSnapshotsTable } from '@/db/budgets/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { createTransactionsTable } from '@/db/transactions/schema'
import {
  createTransactionCategorySuggestionsTable,
  migrateTransactionCategorySuggestionsTable,
} from '@/db/transaction_category_suggestions/schema'

export function openDatabase(dbPath: string): Database {
  const db = new Database(dbPath)
  initDb(db)
  seedCategories(db)
  return db
}

export function initDb(db: Database): void {
  db.run('PRAGMA foreign_keys = ON')
  createCategoriesTable(db)
  createAccountsTable(db)
  createAccountBalanceSnapshotsTable(db)
  createTransactionsTable(db)
  createTransactionCategorySuggestionsTable(db)
  migrateTransactionCategorySuggestionsTable(db)
  createBudgetsTable(db)
  createMonthlyIncomeSnapshotsTable(db)
}
