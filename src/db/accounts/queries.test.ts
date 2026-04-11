import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from './mutations'
import { getAccountByKey, getAccounts } from './queries'
import { createAccountsTable } from './schema'

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  createAccountsTable(db)
})

describe('getAccounts', () => {
  it('returns accounts ordered by key', () => {
    insertAccount(db, {
      key: 'wallet',
      company: 'Pluxee',
      name: 'Meal vouchers',
    })
    insertAccount(db, {
      key: 'checking',
      company: 'Belfius',
      name: 'Main account',
    })

    const accounts = getAccounts(db)

    expect(accounts.map(account => account.key)).toEqual(['checking', 'wallet'])
  })
})

describe('getAccountByKey', () => {
  it('returns undefined when the key is missing', () => {
    expect(getAccountByKey(db, 'missing')).toBeUndefined()
  })

  it('returns the matching account', () => {
    insertAccount(db, {
      key: 'checking',
      company: 'ING',
      name: 'Joint account',
      description: 'Shared household account',
      iban: 'BE00 0000 0000 0000',
    })

    const account = getAccountByKey(db, 'checking')

    expect(account).toEqual({
      id: 1,
      key: 'checking',
      company: 'ING',
      name: 'Joint account',
      description: 'Shared household account',
      iban: 'BE00 0000 0000 0000',
    })
  })
})