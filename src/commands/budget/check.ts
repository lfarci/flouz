import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { openDatabase } from '@/db/schema'
import { collectDescendantIds, getCategories } from '@/db/categories/queries'
import { getBudgetsForMonth, resolveMonthlyTotal } from '@/db/budgets/queries'
import { getTransactions, sumExpensesForCategories } from '@/db/transactions/queries'
import type { Budget, Transaction } from '@/types'
import { currentMonth, validateMonth } from './set'

interface CheckBudgetOptions {
  month?: string
  db: string
}

interface CategoryBudgetProgress {
  categoryName: string
  budgetAmount: number
  spent: number
  remaining: number
  percentage: number
  incomeAvailable: boolean
}

export function daysInMonth(month: string): number {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(year, monthIndex, 0).getDate()
}

export function dayOfMonth(date: Date): number {
  return date.getDate()
}

export function resolveElapsedDay(month: string): number {
  const current = currentMonth()
  if (month < current) return daysInMonth(month)
  if (month > current) return 0
  return dayOfMonth(new Date())
}

export function monthElapsedPercentage(day: number, totalDays: number): number {
  return (day / totalDays) * 100
}

export function renderProgressBar(percentage: number, width: number): string {
  const capped = Math.min(percentage, 100)
  const filled = Math.round((capped / 100) * width)
  const empty = width - filled
  return '▓'.repeat(filled) + '░'.repeat(empty)
}

function isColorEnabled(): boolean {
  if (Bun.env.NO_COLOR !== undefined) return false
  return process.stdout.isTTY === true
}

export function selectColor(spentPercentage: number, elapsedPercentage: number): string {
  if (!isColorEnabled()) return ''
  if (spentPercentage > 100) return '\x1b[31m'
  if (spentPercentage > elapsedPercentage) return '\x1b[33m'
  return '\x1b[32m'
}

function resetCode(): string {
  if (!isColorEnabled()) return ''
  return '\x1b[0m'
}

export function projectedSpending(spent: number, day: number, totalDays: number): number {
  if (day === 0) return spent
  return (spent / day) * totalDays
}

function computeProgress(
  budget: Budget,
  categoryName: string,
  expenses: number,
  income: number,
): CategoryBudgetProgress {
  const incomeAvailable = budget.type !== 'percent' || income > 0
  const resolvedBudget = budget.type === 'percent' ? (budget.amount / 100) * income : budget.amount
  const spent = Math.abs(expenses)
  const remaining = Math.max(0, resolvedBudget - spent)
  const percentage = resolvedBudget > 0 ? (spent / resolvedBudget) * 100 : (spent > 0 ? 100 : 0)
  return { categoryName, budgetAmount: resolvedBudget, spent, remaining, percentage, incomeAvailable }
}

function formatEuro(amount: number): string {
  return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatEuroDecimal(amount: number): string {
  return `€${Math.abs(amount).toFixed(2)}`
}

function renderHeader(month: string, day: number, totalDays: number, totalSpent: number): string {
  const monthName = new Date(`${month}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  return `${monthName}  ·  day ${day} of ${totalDays}  ·  ${formatEuro(totalSpent)} spent so far`
}

function renderProgressRow(
  progress: CategoryBudgetProgress,
  elapsedPercentage: number,
): string {
  const reset = resetCode()

  if (!progress.incomeAvailable) {
    const name = progress.categoryName.padEnd(16)
    return `${name}   —          ${formatEuro(progress.spent).padStart(8)}     (no income data)`
  }

  const color = selectColor(progress.percentage, elapsedPercentage)
  const bar = renderProgressBar(progress.percentage, 10)
  const pctStr = `${Math.round(progress.percentage)}%`
  const status = progress.percentage <= 100 ? '✓' : '⚠'

  const name = progress.categoryName.padEnd(16)
  const budget = formatEuro(progress.budgetAmount).padStart(8)
  const spent = formatEuro(progress.spent).padStart(8)
  const left = formatEuro(progress.remaining).padStart(8)

  return `${color}${name}${budget}    ${spent}    ${left}    ${bar}  ${pctStr.padStart(4)}  ${status}${reset}`
}

function renderTotalRow(totalBudget: number, totalSpent: number): string {
  const remaining = Math.max(0, totalBudget - totalSpent)
  const percentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
  const separator = '─'.repeat(62)

  const name = 'Total'.padEnd(16)
  const budget = formatEuro(totalBudget).padStart(8)
  const spent = formatEuro(totalSpent).padStart(8)
  const left = formatEuro(remaining).padStart(8)

  return `${separator}\n${name}${budget}    ${spent}    ${left}    ${percentage}% of budget used`
}

function renderRecentTransactions(transactions: Transaction[]): string {
  if (transactions.length === 0) return ''

  const header = '\nRECENT TRANSACTIONS (last 7 days)'
  const rows = transactions.slice(0, 10).map((transaction) => {
    const date = new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    const amount = transaction.amount < 0 ? `−${formatEuroDecimal(transaction.amount)}` : `+${formatEuroDecimal(transaction.amount)}`
    return `${date}  ${amount}  ${transaction.counterparty}`
  })

  return `${header}\n${rows.join('\n')}`
}

function renderPaceWarning(totalSpent: number, day: number, totalDays: number, totalBudget: number): string {
  const projected = projectedSpending(totalSpent, day, totalDays)
  const projectedStr = formatEuro(Math.round(projected))
  const budgetStr = formatEuro(totalBudget)
  const warning = projected > totalBudget ? '  ⚠' : ''
  return `\nAt this pace: ~${projectedStr} by end of month  ·  budget is ${budgetStr}${warning}`
}

function isCurrentMonth(month: string): boolean {
  return month === currentMonth()
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

    const incomeRoot = categories.find((candidate) => candidate.slug === 'income')
    const incomeCategoryIds = incomeRoot ? collectDescendantIds(categories, incomeRoot.id) : []
    const hasPercentBudgets = budgets.some((budget) => budget.type === 'percent')
    const monthlyTotal = hasPercentBudgets ? resolveMonthlyTotal(database, incomeCategoryIds, month) : 0

    const progressRows: CategoryBudgetProgress[] = []
    for (const budget of budgets) {
      const category = categories.find((candidate) => candidate.id === budget.categoryId)
      if (category === undefined) continue
      const descendantIds = collectDescendantIds(categories, budget.categoryId)
      const expenses = sumExpensesForCategories(database, descendantIds, month)
      progressRows.push(computeProgress(budget, category.name, expenses, monthlyTotal))
    }

    const totalBudget = progressRows.reduce((sum, row) => sum + row.budgetAmount, 0)
    const totalSpent = progressRows.reduce((sum, row) => sum + row.spent, 0)

    const output: string[] = []
    output.push(renderHeader(month, day, totalDays, totalSpent))
    output.push('')
    output.push('BUDGET PROGRESS')
    output.push('Category        Budget      Spent      Left      Progress')
    for (const row of progressRows) {
      output.push(renderProgressRow(row, elapsed))
    }
    output.push(renderTotalRow(totalBudget, totalSpent))

    if (isCurrentMonth(month)) {
      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 7)
      const recentTransactions = getTransactions(database, {
        from: sevenDaysAgo.toISOString().slice(0, 10),
        to: today.toISOString().slice(0, 10),
      }).filter((transaction) => transaction.amount < 0)
      output.push(renderRecentTransactions(recentTransactions))
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
