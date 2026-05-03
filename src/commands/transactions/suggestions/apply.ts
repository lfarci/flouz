import { log, outro } from '@clack/prompts'
import { type Database } from 'bun:sqlite'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { emptyState } from '@/cli/empty'
import { openDatabase } from '@/db/schema'
import { applyApprovedCategorySuggestions } from '@/db/transaction_category_suggestions/apply'
import { toBaseFilters } from '@/commands/transactions/parse-options'
import type { SuggestionFilters } from '@/types'

interface ApplyOptions {
  from?: string
  to?: string
  search?: string
  limit?: string
  db: string
}

function toSuggestionFilters(options: ApplyOptions): SuggestionFilters {
  return toBaseFilters(options)
}

function applyAction(options: ApplyOptions): void {
  let database: Database | undefined

  try {
    const dbPath = resolve(options.db)
    database = openDatabase(dbPath)

    const filters = toSuggestionFilters(options)
    const { selected, applied, skipped, firstError } = applyApprovedCategorySuggestions(database, filters)

    database.close()

    if (selected === 0) {
      emptyState(
        'No approved suggestions are ready to apply.',
        'Review pending suggestions with `flouz transactions suggestions review`.',
      )
      return
    }

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
