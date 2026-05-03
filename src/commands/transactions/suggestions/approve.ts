import { log, outro } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { emptyState } from '@/cli/empty'
import { openDatabase } from '@/db/schema'
import { getTransactionCategorySuggestions } from '@/db/transaction_category_suggestions/queries'
import { approveTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'
import { toBaseFilters } from '@/commands/transactions/parse-options'
import type { SuggestionFilters } from '@/types'

interface ApproveOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  db: string
}

function toSuggestionFilters(options: ApproveOptions): SuggestionFilters {
  return { ...toBaseFilters(options), status: 'pending' }
}

function approveAction(options: ApproveOptions): void {
  let database: Database | undefined

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const filters = toSuggestionFilters(options)
    const pending = getTransactionCategorySuggestions(database, filters)

    if (pending.length === 0) {
      database.close()
      emptyState('No pending suggestions match the given filters.', 'Run `flouz transactions categorize` to generate suggestions.')
      return
    }

    for (const suggestion of pending) {
      approveTransactionCategorySuggestion(database, suggestion.transactionId)
    }

    database.close()
    outro(`Approved ${pending.length} suggestion${pending.length === 1 ? '' : 's'}`)
  } catch (error) {
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createApproveCommand(defaultDb: string): Command {
  return new Command('approve')
    .description('Approve pending transaction category suggestions')
    .option('-f, --from <date>', 'filter from date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'filter to date (YYYY-MM-DD)')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max suggestions to approve')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(approveAction)
}
