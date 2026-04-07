import { Database } from 'bun:sqlite'
import type { Transaction } from '@/types'

export function computeFingerprint(date: string, amount: number, counterparty: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(JSON.stringify([date, amount, counterparty]))
  return hasher.digest('hex')
}

export function insertTransaction(db: Database, transaction: Omit<Transaction, 'id'>): number {
  const fingerprint = computeFingerprint(transaction.date, transaction.amount, transaction.counterparty)
  const statement = db.prepare(`
    INSERT OR IGNORE INTO transactions
      (fingerprint, date, amount, counterparty, counterparty_iban, currency, account, source_ref,
       category_id, ai_category_id, ai_confidence, ai_reasoning, note, source_file, imported_at)
    VALUES
      ($fingerprint, $date, $amount, $counterparty, $counterpartyIban, $currency, $account, $sourceRef,
       $categoryId, $aiCategoryId, $aiConfidence, $aiReasoning, $note, $sourceFile, $importedAt)
  `)
  const result = statement.run({
    $fingerprint: fingerprint,
    $date: transaction.date,
    $amount: transaction.amount,
    $counterparty: transaction.counterparty,
    $counterpartyIban: transaction.counterpartyIban ?? null,
    $currency: transaction.currency,
    $account: transaction.account ?? null,
    $sourceRef: transaction.sourceRef ?? null,
    $categoryId: transaction.categoryId ?? null,
    $aiCategoryId: transaction.aiCategoryId ?? null,
    $aiConfidence: transaction.aiConfidence ?? null,
    $aiReasoning: transaction.aiReasoning ?? null,
    $note: transaction.note ?? null,
    $sourceFile: transaction.sourceFile ?? null,
    $importedAt: transaction.importedAt,
  })

  return result.changes
}

export function updateCategory(db: Database, id: number, categoryId: string): void {
  db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(categoryId, id)
}