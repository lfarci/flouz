import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { findIncomeCategoryIds, getCategories } from '@/db/categories/queries'
import { getMonthlyIncome, getIncomeForMonth } from '@/db/budgets/queries'
import { formatEuro } from '@/cli/format'
import { currentMonth, validateMonth } from '@/commands/budget/set'

interface ShowTotalOptions {
  month?: string
  db: string
}


function showTotalAction(options: ShowTotalOptions): void {
  const month = options.month ?? currentMonth()
  if (!validateMonth(month)) {
    log.error(`Invalid month format: "${month}". Use YYYY-MM.`)
    process.exit(1)
  }

  const database = openDatabase(resolve(options.db))
  try {
    const stored = getMonthlyIncome(database, month)
    const categories = getCategories(database)
    const incomeCategoryIds = findIncomeCategoryIds(categories)
    const detected = getIncomeForMonth(database, incomeCategoryIds, month)

    if (stored !== undefined) {
      log.info(`Monthly income for ${month}: ${formatEuro(stored)} (manually set)`)
      if (detected > 0 && detected !== stored) {
        log.info(`Detected income from transactions: ${formatEuro(detected)}`)
      }
      return
    }

    if (detected > 0) {
      log.info(`Monthly income for ${month}: ${formatEuro(detected)} (auto-detected from income transactions)`)
      log.info(`Run \`flouz budget total set\` to confirm or override.`)
      return
    }

    log.warn(`No monthly income set for ${month}. Run \`flouz budget total set\` to configure.`)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database.close()
  }
}

export function createShowTotalCommand(defaultDb: string): Command {
  return new Command('show')
    .description('Show the monthly income total')
    .option('-m, --month <YYYY-MM>', 'target month (defaults to current)')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(showTotalAction)
}
