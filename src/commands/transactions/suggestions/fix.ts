import { log, outro } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { findCategoryIdBySlug } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { overrideTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'
import { getSuggestionStatusByTransactionId } from '@/db/transaction_category_suggestions/queries'

interface FixOptions {
  id: string
  category: string
  db: string
}

function parseTransactionId(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid transaction ID: ${value}. Use a positive integer.`)
  }
  return parsed
}

function fixAction(options: FixOptions): void {
  let database: Database | undefined

  try {
    const transactionId = parseTransactionId(options.id)
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const status = getSuggestionStatusByTransactionId(database, transactionId)

    if (status === null) {
      database.close()
      log.error(`No suggestion found for transaction ${transactionId}.`)
      process.exit(1)
    }

    if (status === 'applied') {
      database.close()
      log.error(`Cannot fix an already applied suggestion (transaction ${transactionId}).`)
      process.exit(1)
    }

    const categoryId = findCategoryIdBySlug(database, options.category)

    overrideTransactionCategorySuggestion(database, transactionId, categoryId)

    database.close()
    outro(`Fixed suggestion for transaction ${transactionId} → ${options.category}`)
  } catch (error) {
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createFixCommand(defaultDb: string): Command {
  return new Command('fix')
    .description('Override the suggested category for a transaction')
    .requiredOption('--id <transactionId>', 'transaction ID of the suggestion to fix')
    .requiredOption('--category <slug>', 'correct category slug to use instead')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(fixAction)
}
