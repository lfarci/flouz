import { Database } from 'bun:sqlite'
import type { Account } from '@/types'

type AccountRow = {
  id: number
  key: string
  company: string
  name: string
  description: string | null
  iban: string | null
}

export function getAccounts(db: Database): Account[] {
  const rows = db.prepare(
    'SELECT id, key, company, name, description, iban FROM accounts ORDER BY key ASC'
  ).all() as AccountRow[]

  return rows.map(toAccount)
}

export function getAccountByKey(db: Database, key: string): Account | undefined {
  const row = db.prepare(
    'SELECT id, key, company, name, description, iban FROM accounts WHERE key = ?'
  ).get(key) as AccountRow | null

  if (row === null) return undefined
  return toAccount(row)
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