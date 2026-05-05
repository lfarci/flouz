import { isCancel, log, select, text } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { getCategories } from '@/db/categories/queries'
import { upsertBudget } from '@/db/budgets/mutations'
import type { Category } from '@/types'
import { currentMonth, validateMonth } from './month'
import {
  type ParsedBudgetValue,
  parseBudgetValue,
  findTopLevelCategory,
  getTopLevelBudgetCategories,
  formatBudgetConfirmation,
} from './budget-value'
import {
  DEFAULT_NECESSITIES,
  DEFAULT_DISCRETIONARY,
  DEFAULT_SAVINGS,
  applyDefaultAllocation,
} from './budget-defaults'

interface SetBudgetOptions {
  month?: string
  db: string
  defaults?: boolean
  necessities: string
  discretionary: string
  savings: string
}

async function promptCategorySelection(categories: Category[]): Promise<Category | symbol> {
  return select({
    message: 'Select a category',
    options: getTopLevelBudgetCategories(categories).map((category) => ({
      value: category,
      label: category.name,
    })),
  })
}

function validateAmountInput(value: string | undefined): string | undefined {
  if (!value) return 'Amount is required'
  try {
    parseBudgetValue(value)
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid amount'
  }
}

async function promptBudgetAmount(): Promise<string | symbol> {
  return text({
    message: 'Budget amount (e.g. 500 or 30%)',
    placeholder: '0',
    validate: validateAmountInput,
  })
}

async function resolveCategory(categories: Category[], slug: string | undefined): Promise<Category | null> {
  if (slug !== undefined) return findTopLevelCategory(categories, slug)

  const selection = await promptCategorySelection(categories)
  if (isCancel(selection)) {
    log.warn('Cancelled.')
    return null
  }
  return selection as Category
}

async function resolveParsedAmount(amountValue: string | undefined): Promise<ParsedBudgetValue | null> {
  if (amountValue !== undefined) return parseBudgetValue(amountValue)

  const response = await promptBudgetAmount()
  if (isCancel(response)) {
    log.warn('Cancelled.')
    return null
  }
  return parseBudgetValue(response as string)
}

async function setAction(
  categorySlug: string | undefined,
  amountValue: string | undefined,
  options: SetBudgetOptions,
): Promise<void> {
  const month = options.month ?? currentMonth()
  if (!validateMonth(month)) {
    log.error(`Invalid month format: "${month}". Use YYYY-MM.`)
    process.exit(1)
  }

  if (options.defaults && (categorySlug !== undefined || amountValue !== undefined)) {
    log.error('--defaults cannot be combined with positional [category] or [amount] arguments.')
    process.exit(1)
  }

  const database = openDatabase(resolve(options.db))
  try {
    const categories = getCategories(database)

    if (options.defaults) {
      applyDefaultAllocation(database, categories, month, options)
      return
    }

    const category = await resolveCategory(categories, categorySlug)
    if (category === null) return

    const parsed = await resolveParsedAmount(amountValue)
    if (parsed === null) return

    upsertBudget(database, {
      categoryId: category.id,
      amount: parsed.amount,
      type: parsed.type,
      month,
      createdAt: new Date().toISOString(),
    })
    log.success(formatBudgetConfirmation(category.name, parsed, month))
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database.close()
  }
}

export function createSetBudgetCommand(defaultDb: string): Command {
  return new Command('set')
    .description('Set a monthly budget for a top-level category')
    .argument('[category]', 'category slug (e.g. necessities, discretionary, savings) — prompts if omitted')
    .argument('[amount]', 'budget amount in EUR (e.g. 2000) or percentage of income (e.g. 60%) — prompts if omitted')
    .option('-m, --month <YYYY-MM>', 'target month (defaults to current)')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .option('--defaults', 'apply a default allocation across necessities, discretionary, and savings')
    .option('--necessities <value>', 'necessities allocation for --defaults (e.g. 30%)', DEFAULT_NECESSITIES)
    .option('--discretionary <value>', 'discretionary allocation for --defaults (e.g. 30%)', DEFAULT_DISCRETIONARY)
    .option('--savings <value>', 'savings allocation for --defaults (e.g. 20%)', DEFAULT_SAVINGS)
    .action(setAction)
}
