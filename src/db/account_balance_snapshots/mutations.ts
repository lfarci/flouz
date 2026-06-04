import { type Database } from 'bun:sqlite'
import type { NewAccountBalanceSnapshot } from '@/types'

export function upsertAccountBalanceSnapshot(db: Database, snapshot: NewAccountBalanceSnapshot): void {
  const timestamp = new Date().toISOString()

  db.prepare(
    `
    INSERT INTO account_balance_snapshots (account_id, date, amount, currency, note, created_at, updated_at)
    VALUES ($accountId, $date, $amount, $currency, $note, $createdAt, $updatedAt)
    ON CONFLICT(account_id, date) DO UPDATE SET
      amount = excluded.amount,
      currency = excluded.currency,
      note = excluded.note,
      updated_at = excluded.updated_at
  `,
  ).run({
    $accountId: snapshot.accountId,
    $date: snapshot.date,
    $amount: snapshot.amount,
    $currency: snapshot.currency,
    $note: snapshot.note ?? null,
    $createdAt: timestamp,
    $updatedAt: timestamp,
  })
}
