import { Database } from 'bun:sqlite'
import type { NewAccount } from '@/types'

export function insertAccount(db: Database, account: NewAccount): number {
  const statement = db.prepare(`
    INSERT INTO accounts (key, company, name, description, iban)
    VALUES ($key, $company, $name, $description, $iban)
  `)

  const result = statement.run({
    $key: normalizeAccountKey(account.key),
    $company: account.company,
    $name: account.name,
    $description: account.description ?? null,
    $iban: account.iban ?? null,
  })

  return Number(result.lastInsertRowid)
}

export function deleteAccountByKey(db: Database, key: string): number {
  const result = db.prepare('DELETE FROM accounts WHERE key = ?').run(normalizeAccountKey(key))
  return result.changes
}

export function normalizeAccountKey(key: string): string {
  return key.trim()
}