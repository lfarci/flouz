import { Database } from 'bun:sqlite'
import { createAccountsTable } from '@/db/accounts/schema'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { createTransactionsTable } from '@/db/transactions/schema'

export function openDatabase(dbPath: string): Database {
  const db = new Database(dbPath)
  initDb(db)
  seedCategories(db)
  return db
}

export function initDb(db: Database): void {
  createCategoriesTable(db)
  createAccountsTable(db)
  createTransactionsTable(db)
}
