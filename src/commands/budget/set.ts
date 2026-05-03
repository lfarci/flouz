import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { getCategories } from '@/db/categories/queries'
import { upsertBudget } from '@/db/budgets/mutations'
import type { BudgetType, Category } from '@/types'
import { currentMonth, parseAmount, validateMonth } from './month'

interface SetBudgetOptions {
  month?: string
  db: string
}

interface ParsedBudgetValue {
  amount: number
  type: BudgetType
}

const STRICT_NUMERIC = /^\d+(\.\d+)?$/

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

function setAction(categorySlug: string, amountValue: string, options: SetBudgetOptions): void {
  const month = options.month ?? currentMonth()
  if (!validateMonth(month)) {
    log.error(`Invalid month format: "${month}". Use YYYY-MM.`)
    process.exit(1)
  }

  let parsed: ParsedBudgetValue
  try {
    parsed = parseBudgetValue(amountValue)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  const database = openDatabase(resolve(options.db))
  try {
    const categories = getCategories(database)
    const category = findTopLevelCategory(categories, categorySlug)

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
    .argument('<category>', 'category slug (e.g. necessities, discretionary, savings)')
    .argument('<amount>', 'budget amount in EUR (e.g. 2000) or percentage of income (e.g. 60%)')
    .option('-m, --month <YYYY-MM>', 'target month (defaults to current)')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(setAction)
}
