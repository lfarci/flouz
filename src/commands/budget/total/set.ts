import { isCancel, log, text } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { collectDescendantIds, getCategories } from '@/db/categories/queries'
import { getIncomeForMonth } from '@/db/budgets/queries'
import { upsertMonthlyIncome } from '@/db/budgets/mutations'
import { currentMonth, parseAmount, validateMonth } from '../set'

interface SetTotalOptions {
  month?: string
  db: string
}

function findIncomeCategoryIds(db: ReturnType<typeof openDatabase>): string[] {
  const categories = getCategories(db)
  const incomeRoot = categories.find((category) => category.slug === 'income')
  if (incomeRoot === undefined) return []
  return collectDescendantIds(categories, incomeRoot.id)
}

function formatEuro(amount: number): string {
  return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function setTotalAction(amountValue: string | undefined, options: SetTotalOptions): Promise<void> {
  const month = options.month ?? currentMonth()
  if (!validateMonth(month)) {
    log.error(`Invalid month format: "${month}". Use YYYY-MM.`)
    process.exit(1)
  }

  const database = openDatabase(resolve(options.db))
  try {
    const detectedIncome = getIncomeForMonth(database, findIncomeCategoryIds(database), month)

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
          const parsed = Number.parseFloat(value)
          if (Number.isNaN(parsed) || parsed <= 0) return 'Must be a positive number'
          return undefined
        },
      })

      if (isCancel(response)) {
        log.warn('Cancelled.')
        return
      }

      amount = Number.parseFloat(response)
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
