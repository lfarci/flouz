import { cancel, intro, log, outro, spinner } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { emptyState } from '@/cli/empty'
import { ICON_SUCCESS } from '@/cli/theme'
import { categorizeTransaction } from '@/ai/categorize'
import { getCategories } from '@/db/categories/queries'
import { openDatabase } from '@/db/schema'
import { upsertTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'
import { getCategorizationExamples } from '@/db/transaction_category_suggestions/queries'
import { getTransactionsEligibleForCategorization } from '@/db/transactions/queries'
import type { CategorizeTransactionsFilters, Transaction } from '@/types'

interface CategorizeOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  override?: boolean
  db: string
}

interface CategorizeResult {
  suggested: number
  skipped: number
  error?: Error
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
    override: options.override,
  }
}

function loadEligibleTransactions(db: Database, options: CategorizeOptions): Transaction[] {
  const filters = toCategorizeTransactionsFilters(options)
  return getTransactionsEligibleForCategorization(db, filters)
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

  try {
    for (const transaction of transactions) {
      if (transaction.id === undefined) {
        skipped++
        categorizationSpinner.message(`Categorizing ${suggested + skipped} / ${transactions.length}`)
        continue
      }

      const examples = getCategorizationExamples(db, transaction)
      const result = await categorizeTransaction(transaction, categories, examples, db)
      upsertTransactionCategorySuggestion(db, {
        transactionId: transaction.id,
        categoryId: result.categoryId,
        confidence: result.confidence,
        model: result.model,
        reasoning: result.reasoning,
      })
      suggested++
      categorizationSpinner.message(`Categorizing ${suggested + skipped} / ${transactions.length}`)
    }
  } catch (error) {
    categorizationSpinner.stop(`Categorized ${suggested} / ${transactions.length}`)
    return { suggested, skipped, error: error instanceof Error ? error : new Error(String(error)) }
  }

  categorizationSpinner.stop(`Categorized ${suggested} / ${transactions.length}`)
  return { suggested, skipped }
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
      emptyState('No transactions eligible for categorization.', 'All transactions already have suggestions. Use --override to re-categorize.')
      outro('Done')
      return
    }

    const { suggested, error } = await categorizeTransactions(database, transactions)

    process.removeListener('SIGINT', onCancel)
    database.close()

    if (error !== undefined) {
      log.error(`Categorization failed: ${error.message}`)
      if (suggested > 0) {
        log.info(
          `${suggested} suggestion${suggested === 1 ? ' was' : 's were'} created before the error. ` +
            `Run \`flouz transactions suggestions list\` to review them, then run \`flouz transactions categorize\` again to continue.`,
        )
      } else {
        log.info('No suggestions were created. Fix the issue and run `flouz transactions categorize` again.')
      }
      process.exit(1)
      return
    }

    const selected = transactions.length
    const skipped = selected - suggested
    log.info('Run `flouz transactions suggestions list` to review the suggestions.')
    outro(`${ICON_SUCCESS} ${selected} selected — ${suggested} suggested, ${skipped} skipped`)
  } catch (error) {
    process.removeListener('SIGINT', onCancel)
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createCategorizeCommand(defaultDb: string): Command {
  return new Command('categorize')
    .description('AI-categorize transactions and store suggestions for review')
    .option('-f, --from <date>', 'filter from date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'filter to date (YYYY-MM-DD)')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max transactions to process')
    .option('--override', 'also categorize transactions that already have a category')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(categorizeAction)
}
