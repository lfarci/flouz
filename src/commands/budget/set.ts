import { isCancel, log, select, text } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { type Database } from 'bun:sqlite'
import { openDatabase } from '@/db/schema'
import { getCategories } from '@/db/categories/queries'
import { upsertBudget } from '@/db/budgets/mutations'
import type { BudgetType, Category } from '@/types'
import { currentMonth, parseAmount, validateMonth } from './month'

interface SetBudgetOptions {
  month?: string
  db: string
  defaults?: boolean
  necessities: string
  discretionary: string
  savings: string
}

interface ParsedBudgetValue {
  amount: number
  type: BudgetType
}

const STRICT_NUMERIC = /^\d+(\.\d+)?$/

const DEFAULT_NECESSITIES = '30%'
const DEFAULT_DISCRETIONARY = '30%'
const DEFAULT_SAVINGS = '20%'

export function parseBudgetValue(value: string): ParsedBudgetValue {
  if (value.endsWith('%')) {
    const rawPercentage = value.slice(0, -1).trim()
    if (!STRICT_NUMERIC.test(rawPercentage)) {
      throw new Error(`Invalid percentage: "${value}". Must be between 1% and 100%.`)
    }
    const percentage = Number.parseFloat(rawPercentage)
    if (percentage <= 0 || percentage > 100) {
      throw new Error(`Invalid percentage: "${value}". Must be between 1% and 100%.`)
    }
    return { amount: percentage, type: 'percent' }
  }
  return { amount: parseAmount(value), type: 'fixed' }
}

export function findTopLevelCategory(categories: Category[], slug: string): Category {
  const category = categories.find((candidate) => candidate.slug === slug)
  if (category === undefined) {
    throw new Error(`Category not found: "${slug}"`)
  }
  if (category.parentId !== null) {
    throw new Error('Budgets can only be set on top-level categories')
  }
  return category
}

export function formatBudgetConfirmation(name: string, parsed: ParsedBudgetValue, month: string): string {
  if (parsed.type === 'percent') {
    return `${name} → ${parsed.amount}% of income / month (${month})`
  }
  return `${name} → €${parsed.amount.toFixed(2)} / month (${month})`
}

export function getTopLevelBudgetCategories(categories: Category[]): Category[] {
  return categories.filter((category) => category.parentId === null && category.slug !== 'income')
}

function resolveDefaultValueForSlug(slug: string, options: SetBudgetOptions): string {
  if (slug === 'necessities') return options.necessities
  if (slug === 'discretionary') return options.discretionary
  if (slug === 'savings') return options.savings
  throw new Error(`No default configured for category: "${slug}"`)
}

export function buildDefaultAllocation(
  categories: Category[],
  options: Pick<SetBudgetOptions, 'necessities' | 'discretionary' | 'savings'>,
): Array<{ category: Category; parsed: ParsedBudgetValue }> {
  const targetSlugs = new Set(['necessities', 'discretionary', 'savings'])
  const defaultCategories = getTopLevelBudgetCategories(categories).filter((c) => targetSlugs.has(c.slug))
  return defaultCategories.map((category) => ({
    category,
    parsed: parseBudgetValue(resolveDefaultValueForSlug(category.slug, options as SetBudgetOptions)),
  }))
}

function applyDefaultAllocation(
  database: Database,
  categories: Category[],
  month: string,
  options: SetBudgetOptions,
): void {
  const allocation = buildDefaultAllocation(categories, options)
  for (const { category, parsed } of allocation) {
    upsertBudget(database, {
      categoryId: category.id,
      amount: parsed.amount,
      type: parsed.type,
      month,
      createdAt: new Date().toISOString(),
    })
    log.success(formatBudgetConfirmation(category.name, parsed, month))
  }
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

  const database = openDatabase(resolve(options.db))
  try {
    const categories = getCategories(database)

    if (options.defaults) {
      applyDefaultAllocation(database, categories, month, options)
      return
    }

    const category = await resolveCategory(categories, categorySlug)
    if (category === null) return

    let parsed: ParsedBudgetValue | null = null
    try {
      parsed = await resolveParsedAmount(amountValue)
    } catch (error) {
      log.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
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
