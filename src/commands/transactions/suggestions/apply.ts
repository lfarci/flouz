import { log, outro } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { applyApprovedCategorySuggestions } from '@/db/transaction_category_suggestions/apply'
import { getApprovedSuggestionTransactionIds } from '@/db/transaction_category_suggestions/queries'
import type { SuggestionFilters } from '@/types'

interface ApplyOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  db: string
}

function parseLimit(limit: string | undefined): number | undefined {
  if (limit === undefined) return undefined
  const parsed = Number.parseInt(limit, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid limit: ${limit}. Use a positive integer.`)
  }
  return parsed
}

function toSuggestionFilters(options: ApplyOptions): SuggestionFilters {
  return {
    from: options.from,
    to: options.to,
    search: options.search,
    limit: parseLimit(options.limit),
  }
}

function applyAction(options: ApplyOptions): void {
  let database: Database | undefined

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const filters = toSuggestionFilters(options)
    const selected = getApprovedSuggestionTransactionIds(database, filters).length

    if (selected === 0) {
      database.close()
      log.info('No approved suggestions are ready to apply.')
      return
    }

    const { applied, skipped, firstError } = applyApprovedCategorySuggestions(database, filters)

    database.close()

    if (firstError !== undefined) {
      log.warn(`Some suggestions were skipped. First error: ${firstError}`)
    }

    outro(`${selected} selected — ${applied} applied, ${skipped} skipped`)
  } catch (error) {
    database?.close()
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

export function createApplyCommand(defaultDb: string): Command {
  return new Command('apply')
    .description('Apply approved category suggestions to transactions')
    .option('-f, --from <date>', 'filter from date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'filter to date (YYYY-MM-DD)')
    .option('-s, --search <text>', 'search counterparty')
    .option('-l, --limit <n>', 'max suggestions to apply')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(applyAction)
}
