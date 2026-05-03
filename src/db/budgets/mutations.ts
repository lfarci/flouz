import { type Database } from 'bun:sqlite'
import type { NewBudget } from '@/types'

export function upsertBudget(db: Database, budget: NewBudget): void {
  db.prepare(
    `
    INSERT INTO budgets (category_id, amount, type, month, created_at)
    VALUES ($categoryId, $amount, $type, $month, $createdAt)
    ON CONFLICT(category_id, month) DO UPDATE SET
      amount = excluded.amount,
      type = excluded.type,
      created_at = excluded.created_at
  `,
  ).run({
    $categoryId: budget.categoryId,
    $amount: budget.amount,
    $type: budget.type,
    $month: budget.month,
    $createdAt: budget.createdAt,
  })
}

export function upsertMonthlyIncome(db: Database, month: string, amount: number): void {
  db.prepare(
    `
    INSERT INTO monthly_income (month, amount, created_at)
    VALUES ($month, $amount, $createdAt)
    ON CONFLICT(month) DO UPDATE SET
      amount = excluded.amount,
      created_at = excluded.created_at
  `,
  ).run({
    $month: month,
    $amount: amount,
    $createdAt: new Date().toISOString(),
  })
}
