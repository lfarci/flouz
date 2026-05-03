import type { Budget } from '@/types'
import { currentMonth } from './month'

export interface CategoryBudgetProgress {
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

export function projectedSpending(spent: number, day: number, totalDays: number): number {
  if (day === 0) return spent
  return (spent / day) * totalDays
}

export function computeSpentPercentage(spent: number, resolvedBudget: number): number {
  if (resolvedBudget > 0) return (spent / resolvedBudget) * 100
  return spent > 0 ? 100 : 0
}

export function computeProgress(
  budget: Budget,
  categoryName: string,
  expenses: number,
  income: number,
): CategoryBudgetProgress {
  const incomeAvailable = budget.type !== 'percent' || income > 0
  const resolvedBudget = budget.type === 'percent' ? (budget.amount / 100) * income : budget.amount
  const spent = Math.abs(expenses)
  const remaining = resolvedBudget - spent
  const percentage = computeSpentPercentage(spent, resolvedBudget)
  return { categoryName, budgetAmount: resolvedBudget, spent, remaining, percentage, incomeAvailable }
}

export function isCurrentMonth(month: string): boolean {
  return month === currentMonth()
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const monthPart = String(date.getMonth() + 1).padStart(2, '0')
  const dayPart = String(date.getDate()).padStart(2, '0')
  return `${year}-${monthPart}-${dayPart}`
}
