import { log, outro } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { emptyState } from '@/cli/empty'
import { openDatabase } from '@/db/schema'
import { getTransactionCategorySuggestions } from '@/db/transaction_category_suggestions/queries'
import { deleteTransactionCategorySuggestion } from '@/db/transaction_category_suggestions/mutations'
import { toBaseFilters } from '@/commands/transactions/parse-options'
import type { SuggestionFilters, TransactionCategorySuggestionStatus } from '@/types'

interface RejectOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  status: string
  db: string
}

function parseRejectStatus(value: string): TransactionCategorySuggestionStatus {
  if (value === 'pending' || value === 'approved') return value
  throw new Error(`Invalid status for reject: ${value}. Use pending or approved.`)
}

function toSuggestionFilters(options: RejectOptions): SuggestionFilters {
  return { ...toBaseFilters(options), status: parseRejectStatus(options.status) }
}

function rejectAction(options: RejectOptions): void {
  let database: Database | undefined

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const filters = toSuggestionFilters(options)
    const suggestions = getTransactionCategorySuggestions(database, filters)

    if (suggestions.length === 0) {
      database.close()
      emptyState('No suggestions match the given filters.', 'Check your filters or run `flouz transactions categorize` first.')
      return
    }

    for (const suggestion of suggestions) {
      deleteTransactionCategorySuggestion(database, suggestion.transactionId)
    }

    database.close()
    outro(`Rejected ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`)
  } catch (error) {
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createRejectCommand(defaultDb: string): Command {
  return new Command('reject')
    .description('Reject (delete) pending or approved transaction category suggestions')
    .option('-f, --from <date>', 'filter from date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'filter to date (YYYY-MM-DD)')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max suggestions to reject')
    .option('--status <status>', 'status to reject (pending or approved)', 'pending')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(rejectAction)
}
