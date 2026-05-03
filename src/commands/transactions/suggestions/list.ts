import { log } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { emptyState } from '@/cli/empty'
import { formatAmount, formatConfidence } from '@/cli/format'
import { colorAmount } from '@/cli/theme'
import { openDatabase } from '@/db/schema'
import { getTransactionCategorySuggestions } from '@/db/transaction_category_suggestions/queries'
import { toBaseFilters } from '@/commands/transactions/parse-options'
import type { SuggestionFilters, SuggestionWithContext, TransactionCategorySuggestionStatus } from '@/types'
import { renderCliTable } from '@/cli/table'
import { isBrokenPipeError, writeStdout } from '@/cli/stdout'

interface ListOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  status: string
  db: string
}

function parseStatus(value: string): TransactionCategorySuggestionStatus {
  if (value === 'pending' || value === 'approved' || value === 'applied') return value
  throw new Error(`Invalid status: ${value}. Use pending, approved, or applied.`)
}

function toSuggestionFilters(options: ListOptions): SuggestionFilters {
  return { ...toBaseFilters(options), status: parseStatus(options.status) }
}

function formatSuggestionsTable(suggestions: SuggestionWithContext[]): string[] {
  const hasAnyReasoning = suggestions.some((suggestion) => suggestion.reasoning !== undefined)

  const columns = [
    { header: 'ID', width: 6, minWidth: 4, truncate: 6 },
    { header: 'Date', width: 10, minWidth: 10, truncate: 10 },
    { header: 'Amount', width: 10, minWidth: 8, alignment: 'right' as const },
    { header: 'Counterparty', width: 26, minWidth: 14, wrapWord: true },
    { header: 'Category', width: 20, minWidth: 12, wrapWord: true },
    { header: 'Conf.', width: 6, minWidth: 6, truncate: 6 },
    { header: 'Status', width: 10, minWidth: 8, truncate: 10 },
    ...(hasAnyReasoning ? [{ header: 'Reasoning', width: 36, minWidth: 16, wrapWord: true }] : []),
  ]

  const rows = suggestions.map((suggestion) => {
    const baseRow = [
      String(suggestion.transactionId),
      suggestion.transactionDate,
      colorAmount(suggestion.amount, formatAmount(suggestion.amount)),
      suggestion.counterparty,
      suggestion.categoryName,
      formatConfidence(suggestion.confidence),
      suggestion.status,
    ]
    if (hasAnyReasoning) baseRow.push(suggestion.reasoning ?? '')
    return baseRow
  })

  return renderCliTable({ columns, rows })
}

async function listAction(options: ListOptions): Promise<void> {
  let database: Database | undefined

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const filters = toSuggestionFilters(options)
    const suggestions = getTransactionCategorySuggestions(database, filters)

    database.close()

    if (suggestions.length === 0) {
      emptyState(`No ${options.status} suggestions found.`)
      return
    }

    const lines = formatSuggestionsTable(suggestions)
    await writeStdout(`${lines.join('\n')}\n`)
  } catch (error) {
    database?.close()
    if (isBrokenPipeError(error)) {
      process.exit(0)
    }
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createListSuggestionsCommand(defaultDb: string): Command {
  return new Command('list')
    .description('List transaction category suggestions')
    .option('-f, --from <date>', 'filter from date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'filter to date (YYYY-MM-DD)')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max results')
    .option('--status <status>', 'filter by status (pending, approved, applied)', 'pending')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(listAction)
}
