import { Database } from 'bun:sqlite'
import { createAccountsTable } from '@/db/accounts/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { createTransactionsTable } from '@/db/transactions/schema'
import { createTransactionCategorySuggestionsTable } from '@/db/transaction_category_suggestions/schema'

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
  createTransactionsTable(db)
  createTransactionCategorySuggestionsTable(db)
}
