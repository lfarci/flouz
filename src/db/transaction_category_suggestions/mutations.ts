import { type Database } from 'bun:sqlite'
import type { NewTransactionCategorySuggestion } from '@/types'

export function upsertTransactionCategorySuggestion(db: Database, suggestion: NewTransactionCategorySuggestion): void {
  const suggestedAt = new Date().toISOString()

  db.prepare(
    `
    INSERT INTO transaction_category_suggestions
      (transaction_id, category_id, confidence, model, suggested_at, status, reviewed_at, applied_at)
    VALUES
      ($transactionId, $categoryId, $confidence, $model, $suggestedAt, 'pending', NULL, NULL)
    ON CONFLICT(transaction_id) DO UPDATE SET
      category_id  = excluded.category_id,
      confidence   = excluded.confidence,
      model        = excluded.model,
      suggested_at = excluded.suggested_at,
      status       = 'pending',
      reviewed_at  = NULL,
      applied_at   = NULL
  `,
  ).run({
    $transactionId: suggestion.transactionId,
    $categoryId: suggestion.categoryId,
    $confidence: suggestion.confidence,
    $model: suggestion.model,
    $suggestedAt: suggestedAt,
  })
}

export function approveTransactionCategorySuggestion(db: Database, transactionId: number): void {
  const reviewedAt = new Date().toISOString()

  db.prepare(
    `
    UPDATE transaction_category_suggestions
    SET status = 'approved', reviewed_at = ?
    WHERE transaction_id = ? AND status = 'pending'
  `,
  ).run(reviewedAt, transactionId)
}

export function deleteTransactionCategorySuggestion(db: Database, transactionId: number): void {
  db.prepare(
    `
    DELETE FROM transaction_category_suggestions
    WHERE transaction_id = ? AND status IN ('pending', 'approved')
  `,
  ).run(transactionId)
}

export function overrideTransactionCategorySuggestion(db: Database, transactionId: number, categoryId: string): void {
  db.prepare(
    `
    UPDATE transaction_category_suggestions
    SET category_id = ?, status = 'pending', reviewed_at = NULL, applied_at = NULL
    WHERE transaction_id = ? AND status IN ('pending', 'approved')
  `,
  ).run(categoryId, transactionId)
}

export function markApprovedSuggestionApplied(db: Database, transactionId: number): void {
  const appliedAt = new Date().toISOString()

  db.prepare(
    `
    UPDATE transaction_category_suggestions
    SET status = 'applied', applied_at = ?
    WHERE transaction_id = ? AND status = 'approved'
  `,
  ).run(appliedAt, transactionId)
}
