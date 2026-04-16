import { type Database } from 'bun:sqlite'
import type { Account } from '@/types'

interface AccountRow {
  id: number
  key: string
  company: string
  name: string
  description: string | null
  iban: string | null
}

export function getAccounts(db: Database): Account[] {
  const rows = db
    .prepare('SELECT id, key, company, name, description, iban FROM accounts ORDER BY key ASC')
    .all() as AccountRow[]

  return rows.map(toAccount)
}

export function getFirstAccount(db: Database): Account | undefined {
  const row = db
    .prepare('SELECT id, key, company, name, description, iban FROM accounts ORDER BY id ASC LIMIT 1')
    .get() as AccountRow | null

  if (row === null) return undefined
  return toAccount(row)
}

export function getAccountByKey(db: Database, key: string): Account | undefined {
  const row = db
    .prepare('SELECT id, key, company, name, description, iban FROM accounts WHERE key = ?')
    .get(key) as AccountRow | null

  if (row === null) return undefined
  return toAccount(row)
}

export function countAccounts(db: Database): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM accounts').get() as {
    count: number
  }
  return row.count
}

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    key: row.key,
    company: row.company,
    name: row.name,
    description: row.description ?? undefined,
    iban: row.iban ?? undefined,
  }
}
