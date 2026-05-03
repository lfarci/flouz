import { isCancel, log, text } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { findIncomeCategoryIds, getCategories } from '@/db/categories/queries'
import { getIncomeForMonth } from '@/db/budgets/queries'
import { upsertMonthlyIncome } from '@/db/budgets/mutations'
import { formatEuro } from '@/cli/format'
import { currentMonth, parseAmount, validateMonth } from '@/commands/budget/month'

interface SetTotalOptions {
  month?: string
  db: string
}



async function setTotalAction(amountValue: string | undefined, options: SetTotalOptions): Promise<void> {
  const month = options.month ?? currentMonth()
  if (!validateMonth(month)) {
    log.error(`Invalid month format: "${month}". Use YYYY-MM.`)
    process.exit(1)
  }

  const database = openDatabase(resolve(options.db))
  try {
    const categories = getCategories(database)
    const detectedIncome = getIncomeForMonth(database, findIncomeCategoryIds(categories), month)

    let amount: number
    if (amountValue !== undefined) {
      amount = parseAmount(amountValue)
    } else {
      const defaultValue = detectedIncome > 0 ? detectedIncome.toString() : ''
      const hint = detectedIncome > 0 ? ` (detected ${formatEuro(detectedIncome)} from income transactions)` : ''

      const response = await text({
        message: `Monthly income for ${month}${hint}`,
        placeholder: defaultValue || 'Enter amount in EUR',
        defaultValue: defaultValue || undefined,
        validate: (value: string | undefined) => {
          if (value === undefined) return 'Must be a positive number'
          try {
            parseAmount(value)
            return undefined
          } catch {
            return 'Must be a positive number'
          }
        },
      })

      if (isCancel(response)) {
        log.warn('Cancelled.')
        return
      }

      amount = parseAmount(response)
    }

    upsertMonthlyIncome(database, month, amount)
    log.success(`Monthly income for ${month} set to ${formatEuro(amount)}`)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database.close()
  }
}

export function createSetTotalCommand(defaultDb: string): Command {
  return new Command('set')
    .description('Set the monthly income total (auto-detects from income if no amount given)')
    .argument('[amount]', 'monthly income in EUR (prompts interactively if omitted)')
    .option('-m, --month <YYYY-MM>', 'target month (defaults to current)')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(setTotalAction)
}
