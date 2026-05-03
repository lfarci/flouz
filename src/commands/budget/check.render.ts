import { colorsEnabled } from '@/cli/theme'
import { formatEuro, formatEuroDecimal } from '@/cli/format'
import type { Transaction } from '@/types'
import { projectedSpending, type CategoryBudgetProgress } from './check.compute'

export function renderProgressBar(percentage: number, width: number): string {
  const capped = Math.min(percentage, 100)
  const filled = Math.round((capped / 100) * width)
  const empty = width - filled
  return '▓'.repeat(filled) + '░'.repeat(empty)
}

export function selectColor(spentPercentage: number, elapsedPercentage: number): string {
  if (!colorsEnabled()) return ''
  if (spentPercentage > 100) return '\x1b[31m'
  if (spentPercentage > elapsedPercentage) return '\x1b[33m'
  return '\x1b[32m'
}

function resetCode(): string {
  if (!colorsEnabled()) return ''
  return '\x1b[0m'
}

export function renderHeader(month: string, day: number, totalDays: number, totalSpent: number): string {
  const [year, monthIndex] = month.split('-').map(Number)
  const monthName = new Date(year, monthIndex - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  return `${monthName}  ·  day ${day} of ${totalDays}  ·  ${formatEuro(totalSpent)} spent so far`
}

export function renderProgressRow(progress: CategoryBudgetProgress, elapsedPercentage: number): string {
  const reset = resetCode()

  if (!progress.incomeAvailable) {
    const name = progress.categoryName.padEnd(16)
    return `${name}   —          ${formatEuro(progress.spent).padStart(8)}     (no income data)`
  }

  const color = selectColor(progress.percentage, elapsedPercentage)
  const bar = renderProgressBar(progress.percentage, 10)
  const percentageLabel = `${Math.round(progress.percentage)}%`
  const status = progress.percentage <= 100 ? '✓' : '⚠'

  const name = progress.categoryName.padEnd(16)
  const budget = formatEuro(progress.budgetAmount).padStart(8)
  const spent = formatEuro(progress.spent).padStart(8)
  const left = formatEuro(progress.remaining).padStart(8)

  return `${color}${name}${budget}    ${spent}    ${left}    ${bar}  ${percentageLabel.padStart(4)}  ${status}${reset}`
}

export function renderTotalRow(totalBudget: number, totalSpent: number): string {
  const remaining = totalBudget - totalSpent
  const percentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
  const separator = '─'.repeat(62)

  const name = 'Total'.padEnd(16)
  const budget = formatEuro(totalBudget).padStart(8)
  const spent = formatEuro(totalSpent).padStart(8)
  const left = formatEuro(remaining).padStart(8)

  return `${separator}\n${name}${budget}    ${spent}    ${left}    ${percentage}% of budget used`
}

export function renderRecentTransactions(transactions: Transaction[]): string {
  if (transactions.length === 0) return ''

  const header = '\nRECENT TRANSACTIONS (last 7 days)'
  const rows = transactions.slice(0, 10).map((transaction) => {
    const [year, month, day] = transaction.date.split('-').map(Number)
    const date = new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    const amount =
      transaction.amount < 0 ? `−${formatEuroDecimal(transaction.amount)}` : `+${formatEuroDecimal(transaction.amount)}`
    return `${date}  ${amount}  ${transaction.counterparty}`
  })

  return `${header}\n${rows.join('\n')}`
}

export function renderPaceWarning(totalSpent: number, day: number, totalDays: number, totalBudget: number): string {
  const projected = projectedSpending(totalSpent, day, totalDays)
  const projectedStr = formatEuro(Math.round(projected))
  const budgetStr = formatEuro(totalBudget)
  const warning = projected > totalBudget ? '  ⚠' : ''
  return `\nAt this pace: ~${projectedStr} by end of month  ·  budget is ${budgetStr}${warning}`
}
