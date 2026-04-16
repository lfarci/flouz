import { log, outro } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { overrideTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'

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

function resolveCategoryId(db: Database, slug: string): string {
  const categories = getCategories(db)
  const match = categories.find(c => c.slug === slug)
  if (match === undefined) {
    const known = categories.map(c => c.slug).join(', ')
    throw new Error(`Unknown category slug: "${slug}". Known slugs: ${known}`)
  }
  return match.id
}

function getSuggestionStatus(db: Database, transactionId: number): string | null {
  const row = db.prepare(
    'SELECT status FROM transaction_category_suggestions WHERE transaction_id = ?'
  ).get(transactionId) as { status: string } | null
  return row?.status ?? null
}

function fixAction(options: FixOptions): void {
  let database: Database | undefined

  try {
    const transactionId = parseTransactionId(options.id)
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const status = getSuggestionStatus(database, transactionId)

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

    const categoryId = resolveCategoryId(database, options.category)

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
