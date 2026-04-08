import { Database } from 'bun:sqlite'
import { createCategoriesTable } from '@/db/categories/schema'
import { seedCategories } from '@/db/categories/seed'
import { createTransactionsTable, createDuplicateTransactionsTable } from '@/db/transactions/schema'

export function openDatabase(dbPath: string): Database {
  const db = new Database(dbPath)
  initDb(db)
  seedCategories(db)
  return db
}

export function initDb(db: Database): void {
  createCategoriesTable(db)
  createTransactionsTable(db)
  createDuplicateTransactionsTable(db)
}
