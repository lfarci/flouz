import { type Database } from 'bun:sqlite'
import { computeTransactionHash } from '@/db/transactions/hash'
import type { NewTransaction } from '@/types'

export function insertTransaction(db: Database, transaction: NewTransaction): number {
  const statement = db.prepare(`
    INSERT INTO transactions
      (date, amount, counterparty, hash, counterparty_iban, currency, account_id,
       category_id, note, source_file, imported_at)
    VALUES
      ($date, $amount, $counterparty, $hash, $counterpartyIban, $currency, $accountId,
       $categoryId, $note, $sourceFile, $importedAt)
  `)
  const result = statement.run({
    $date: transaction.date,
    $amount: transaction.amount,
    $counterparty: transaction.counterparty,
    $hash: computeTransactionHash(transaction),
    $counterpartyIban: transaction.counterpartyIban ?? null,
    $currency: transaction.currency,
    $accountId: transaction.accountId ?? null,
    $categoryId: transaction.categoryId ?? null,
    $note: transaction.note ?? null,
    $sourceFile: transaction.sourceFile ?? null,
    $importedAt: transaction.importedAt,
  })

  return result.changes
}

export function updateCategory(db: Database, id: number, categoryId: string): void {
  db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(categoryId, id)
}