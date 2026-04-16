import { cancel, intro, log, outro, spinner } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { categorizeTransaction } from '@/ai/categorize'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { upsertTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'
import { getTransactionsMissingCategoryForCategorization } from '@/db/transactions/queries'
import type { CategorizeTransactionsFilters, Transaction } from '@/types'

interface CategorizeOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  db: string
}

interface CategorizeResult {
  suggested: number
  skipped: number
  firstError?: string
}

function parseLimit(limit: string | undefined): number | undefined {
  if (limit === undefined) return undefined

  const parsedLimit = Number.parseInt(limit, 10)
  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    throw new Error(`Invalid limit: ${limit}. Use a positive integer.`)
  }

  return parsedLimit
}

function toCategorizeTransactionsFilters(options: CategorizeOptions): CategorizeTransactionsFilters {
  return {
    from: options.from,
    to: options.to,
    search: options.search,
    limit: parseLimit(options.limit),
  }
}

function loadEligibleTransactions(db: Database, options: CategorizeOptions): Transaction[] {
  const filters = toCategorizeTransactionsFilters(options)
  return getTransactionsMissingCategoryForCategorization(db, filters)
}

async function categorizeTransactions(db: Database, transactions: Transaction[]): Promise<CategorizeResult> {
  const categories = getCategories(db)

  if (categories.length === 0) {
    log.warn('No categories available — skipping all transactions.')
    return { suggested: 0, skipped: transactions.length }
  }

  const categorizationSpinner = spinner()
  categorizationSpinner.start(`Categorizing 0 / ${transactions.length}`)

  let suggested = 0
  let skipped = 0
  let firstError: string | undefined

  for (const transaction of transactions) {
    if (transaction.id === undefined) {
      skipped++
      categorizationSpinner.message(`Categorizing ${suggested + skipped} / ${transactions.length}`)
      continue
    }

    try {
      const result = await categorizeTransaction(transaction, categories)
      upsertTransactionCategorySuggestion(db, {
        transactionId: transaction.id,
        categoryId: result.categoryId,
        confidence: result.confidence,
        model: result.model,
      })
      suggested++
    } catch (error) {
      skipped++
      firstError ??= error instanceof Error ? error.message : String(error)
    }

    categorizationSpinner.message(`Categorizing ${suggested + skipped} / ${transactions.length}`)
  }

  categorizationSpinner.stop(`Categorized ${suggested} / ${transactions.length}`)
  return { suggested, skipped, firstError }
}

async function categorizeAction(options: CategorizeOptions): Promise<void> {
  intro('AI Transaction Categorization')

  let database: Database | undefined
  const onCancel = () => {
    database?.close()
    cancel('Categorization cancelled.')
    process.exit(1)
  }
  process.once('SIGINT', onCancel)

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const transactions = loadEligibleTransactions(database, options)

    if (transactions.length === 0) {
      process.removeListener('SIGINT', onCancel)
      database.close()
      log.info('No transactions eligible for categorization.')
      outro('Done')
      return
    }

    const { suggested, firstError } = await categorizeTransactions(database, transactions)

    process.removeListener('SIGINT', onCancel)
    database.close()

    const selected = transactions.length
    const skipped = selected - suggested
    if (firstError !== undefined) {
      log.warn(`Some transactions were skipped. First error: ${firstError}`)
    }
    outro(`✓ ${selected} selected — ${suggested} suggested, ${skipped} skipped`)
  } catch (error) {
    process.removeListener('SIGINT', onCancel)
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createCategorizeCommand(defaultDb: string): Command {
  return new Command('categorize')
    .description('AI-categorize uncategorized transactions without an existing suggestion')
    .option('-f, --from <date>', 'filter from date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'filter to date (YYYY-MM-DD)')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max transactions to process')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(categorizeAction)
}
