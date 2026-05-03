import { type Database } from 'bun:sqlite'
import type { Budget, BudgetType } from '@/types'

function rowToBudget(row: Record<string, unknown>): Budget {
  return {
    id: row.id as number,
    categoryId: row.category_id as string,
    amount: row.amount as number,
    type: (row.type as BudgetType) ?? 'fixed',
    month: row.month as string,
    createdAt: row.created_at as string,
  }
}

export function getBudgetsForMonth(db: Database, month: string): Budget[] {
  const rows = db
    .prepare('SELECT * FROM budgets WHERE month = ? ORDER BY category_id')
    .all(month) as Record<string, unknown>[]
  return rows.map(rowToBudget)
}

export function getBudgetForCategory(db: Database, categoryId: string, month: string): Budget | undefined {
  const row = db
    .prepare('SELECT * FROM budgets WHERE category_id = ? AND month = ?')
    .get(categoryId, month) as Record<string, unknown> | null
  if (row === null) return undefined
  return rowToBudget(row)
}

export function getMonthlyIncome(db: Database, month: string): number | undefined {
  const row = db
    .prepare('SELECT amount FROM monthly_income WHERE month = ?')
    .get(month) as { amount: number } | null
  if (row === null) return undefined
  return row.amount
}

export function getIncomeForMonth(db: Database, incomeCategoryIds: string[], month: string): number {
  if (incomeCategoryIds.length === 0) return 0
  const placeholders = incomeCategoryIds.map(() => '?').join(', ')
  const row = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE amount > 0
      AND date LIKE ?
      AND category_id IN (${placeholders})
  `).get(`${month}-%`, ...incomeCategoryIds) as { total: number }
  return row.total
}

export function previousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  if (m === 1) return `${year - 1}-12`
  return `${year}-${String(m - 1).padStart(2, '0')}`
}

export function resolveMonthlyTotal(db: Database, incomeCategoryIds: string[], month: string): number {
  const stored = getMonthlyIncome(db, month)
  if (stored !== undefined) return stored

  const income = getIncomeForMonth(db, incomeCategoryIds, month)
  if (income > 0) return income

  const previousStored = getMonthlyIncome(db, previousMonth(month))
  if (previousStored !== undefined) return previousStored

  return getIncomeForMonth(db, incomeCategoryIds, previousMonth(month))
}
