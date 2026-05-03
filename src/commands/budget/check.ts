import { type Database } from 'bun:sqlite'
import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { collectDescendantIds, findIncomeCategoryIds, getCategories } from '@/db/categories/queries'
import { getBudgetsForMonth, resolveMonthlyTotal } from '@/db/budgets/queries'
import { getTransactions, sumExpensesForCategories } from '@/db/transactions/queries'
import type { Budget, Category, Transaction } from '@/types'
import { currentMonth, validateMonth } from './month'
import {
  computeProgress,
  daysInMonth,
  formatLocalDate,
  isCurrentMonth,
  monthElapsedPercentage,
  resolveElapsedDay,
  type CategoryBudgetProgress,
} from './check.compute'
import {
  renderHeader,
  renderPaceWarning,
  renderProgressRow,
  renderRecentTransactions,
  renderTotalRow,
} from './check.render'

interface CheckBudgetOptions {
  month?: string
  db: string
}

function resolveIncomeTotal(database: Database, categories: Category[], budgets: Budget[], month: string): number {
  const hasPercentBudgets = budgets.some((budget) => budget.type === 'percent')
  if (!hasPercentBudgets) return 0
  return resolveMonthlyTotal(database, findIncomeCategoryIds(categories), month)
}

function computeBudgetProgress(
  database: Database,
  budgets: Budget[],
  categories: Category[],
  monthlyTotal: number,
  month: string,
): CategoryBudgetProgress[] {
  const rows: CategoryBudgetProgress[] = []
  for (const budget of budgets) {
    const category = categories.find((candidate) => candidate.id === budget.categoryId)
    if (category === undefined) continue
    const descendantIds = collectDescendantIds(categories, budget.categoryId)
    const expenses = sumExpensesForCategories(database, descendantIds, month)
    rows.push(computeProgress(budget, category.name, expenses, monthlyTotal))
  }
  return rows
}

function fetchRecentExpenses(database: Database): Transaction[] {
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  return getTransactions(database, {
    from: formatLocalDate(sevenDaysAgo),
    to: formatLocalDate(today),
  }).filter((transaction) => transaction.amount < 0)
}

function assembleProgressOutput(
  month: string,
  day: number,
  totalDays: number,
  elapsed: number,
  progressRows: CategoryBudgetProgress[],
  totalBudget: number,
  totalSpent: number,
): string[] {
  const output: string[] = []
  output.push(renderHeader(month, day, totalDays, totalSpent))
  output.push('')
  output.push('BUDGET PROGRESS')
  output.push('Category        Budget      Spent      Left      Progress')
  for (const row of progressRows) {
    output.push(renderProgressRow(row, elapsed))
  }
  output.push(renderTotalRow(totalBudget, totalSpent))
  return output
}

function checkAction(options: CheckBudgetOptions): void {
  const month = options.month ?? currentMonth()
  if (!validateMonth(month)) {
    log.error(`Invalid month format: "${month}". Use YYYY-MM.`)
    process.exit(1)
  }

  const database = openDatabase(resolve(options.db))
  try {
    const budgets = getBudgetsForMonth(database, month)
    if (budgets.length === 0) {
      log.warn('No budgets configured. Run `flouz budget set` first.')
      return
    }

    const categories = getCategories(database)
    const day = resolveElapsedDay(month)
    const totalDays = daysInMonth(month)
    const elapsed = monthElapsedPercentage(day, totalDays)
    const monthlyTotal = resolveIncomeTotal(database, categories, budgets, month)
    const progressRows = computeBudgetProgress(database, budgets, categories, monthlyTotal, month)
    const totalBudget = progressRows.reduce((sum, row) => sum + row.budgetAmount, 0)
    const totalSpent = progressRows.reduce((sum, row) => sum + row.spent, 0)

    const output = assembleProgressOutput(month, day, totalDays, elapsed, progressRows, totalBudget, totalSpent)
    if (isCurrentMonth(month)) {
      output.push(renderRecentTransactions(fetchRecentExpenses(database)))
    }
    output.push(renderPaceWarning(totalSpent, day, totalDays, totalBudget))
    log.message(output.join('\n'))
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database.close()
  }
}

export function createCheckBudgetCommand(defaultDb: string): Command {
  return new Command('check')
    .description('Check budget progress for the month')
    .option('-m, --month <YYYY-MM>', 'target month (defaults to current)')
    .option('-d, --db <path>', 'SQLite database path', defaultDb)
    .action(checkAction)
}
