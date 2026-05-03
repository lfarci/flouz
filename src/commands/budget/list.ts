import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { renderCliTable } from '@/cli/table'
import { openDatabase } from '@/db/schema'
import { findIncomeCategoryIds, getCategories } from '@/db/categories/queries'
import { getBudgetsForMonth, resolveMonthlyTotal } from '@/db/budgets/queries'
import type { Budget, Category } from '@/types'
import { currentMonth, validateMonth } from './set'

interface ListBudgetOptions {
  month?: string
  db: string
}

interface BudgetRow {
  categoryName: string
  amount: string
}

export function resolveCategoryName(categoryId: string, categories: Category[]): string {
  const category = categories.find((candidate) => candidate.id === categoryId)
  return category?.name ?? categoryId
}

export function formatBudgetAmount(budget: Budget, income: number): string {
  if (budget.type === 'percent') {
    const resolved = (budget.amount / 100) * income
    if (income === 0) return `€0 (${budget.amount}% — no income data)`
    const resolvedStr = resolved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const incomeStr = income.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return `€${resolvedStr} (${budget.amount}% of €${incomeStr})`
  }
  return `€${budget.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function toBudgetRows(budgets: Budget[], categories: Category[], income: number): BudgetRow[] {
  return budgets.map((budget) => ({
    categoryName: resolveCategoryName(budget.categoryId, categories),
    amount: formatBudgetAmount(budget, income),
  }))
}

export function formatBudgetTable(rows: BudgetRow[]): string[] {
  return renderCliTable({
    columns: [
      { header: 'Category', width: 20, minWidth: 14, truncate: 20 },
      { header: 'Monthly (€)', width: 30, minWidth: 14, truncate: 30 },
    ],
    rows: rows.map((row) => [row.categoryName, row.amount]),
  })
}

function listAction(options: ListBudgetOptions): void {
  const month = options.month ?? currentMonth()
  if (!validateMonth(month)) {
    log.error(`Invalid month format: "${month}". Use YYYY-MM.`)
    process.exit(1)
  }

  const database = openDatabase(resolve(options.db))
  try {
    const budgets = getBudgetsForMonth(database, month)
    if (budgets.length === 0) {
      log.info(`No budgets set for ${month}.`)
      return
    }

    const categories = getCategories(database)
    const hasPercentBudgets = budgets.some((budget) => budget.type === 'percent')
    const monthlyTotal = hasPercentBudgets ? resolveMonthlyTotal(database, findIncomeCategoryIds(categories), month) : 0
    const rows = toBudgetRows(budgets, categories, monthlyTotal)
    log.message(formatBudgetTable(rows), { spacing: 0, withGuide: false })
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database.close()
  }
}

export function createListBudgetCommand(defaultDb: string): Command {
  return new Command('list')
    .description('List budgets for a given month')
    .option('-m, --month <YYYY-MM>', 'target month (defaults to current)')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(listAction)
}
