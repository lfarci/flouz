import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { insertAccount } from './mutations'
import { countAccounts, getAccountByKey, getAccounts, getFirstAccount } from './queries'
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

describe('getFirstAccount', () => {
  it('returns undefined when there are no accounts', () => {
    expect(getFirstAccount(db)).toBeUndefined()
  })

  it('returns the first inserted account', () => {
    insertAccount(db, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })
    insertAccount(db, {
      key: 'wallet',
      company: 'Provider Two',
      name: 'Meal card',
    })

    const account = getFirstAccount(db)

    expect(account).toEqual({
      id: 1,
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })
  })
})

describe('getAccountByKey', () => {
  it('returns undefined when the key is missing', () => {
    expect(getAccountByKey(db, 'missing')).toBeUndefined()
  })

  it('returns the matching account', () => {
    insertAccount(db, {
      key: 'checking',
      company: 'Provider One',
      name: 'Joint account',
      description: 'Shared household account',
      iban: 'BE00 0000 0000 0000',
    })

    const account = getAccountByKey(db, 'checking')

    expect(account).toEqual({
      id: 1,
      key: 'checking',
      company: 'Provider One',
      name: 'Joint account',
      description: 'Shared household account',
      iban: 'BE00 0000 0000 0000',
    })
  })
})

describe('countAccounts', () => {
  it('returns 0 when there are no accounts', () => {
    expect(countAccounts(db)).toBe(0)
  })

  it('returns the number of accounts', () => {
    insertAccount(db, {
      key: 'checking',
      company: 'Provider One',
      name: 'Main account',
    })
    insertAccount(db, {
      key: 'wallet',
      company: 'Provider Two',
      name: 'Meal card',
    })

    expect(countAccounts(db)).toBe(2)
  })
})