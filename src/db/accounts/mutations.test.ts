import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { deleteAccountByKey, insertAccount, normalizeAccountKey } from './mutations'
import { createAccountsTable } from './schema'

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  createAccountsTable(db)
})

describe('insertAccount', () => {
  it('inserts an account and returns its id', () => {
    const id = insertAccount(db, {
      key: 'checking',
      company: 'Belfius',
      name: 'Main account',
    })

    expect(id).toBe(1)
  })

  it('stores optional fields when present', () => {
    insertAccount(db, {
      key: 'vouchers',
      company: 'Pluxee',
      name: 'Meal vouchers',
      description: 'Employer meal card',
      iban: 'BE00 0000 0000 0000',
    })

    const row = db
      .query<{ description: string | null; iban: string | null }, []>('SELECT description, iban FROM accounts LIMIT 1')
      .get()

    expect(row?.description).toBe('Employer meal card')
    expect(row?.iban).toBe('BE00 0000 0000 0000')
  })

  it('rejects duplicate keys', () => {
    insertAccount(db, {
      key: 'checking',
      company: 'Belfius',
      name: 'Main account',
    })

    expect(() => {
      insertAccount(db, {
        key: 'checking',
        company: 'ING',
        name: 'Other account',
      })
    }).toThrow()
  })
})

describe('deleteAccountByKey', () => {
  it('deletes the matching account and returns 1', () => {
    insertAccount(db, {
      key: 'checking',
      company: 'Belfius',
      name: 'Main account',
    })

    const changes = deleteAccountByKey(db, 'checking')

    expect(changes).toBe(1)
  })

  it('returns 0 when the key does not exist', () => {
    expect(deleteAccountByKey(db, 'missing')).toBe(0)
  })
})

describe('normalizeAccountKey', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeAccountKey('  checking  ')).toBe('checking')
  })
})
