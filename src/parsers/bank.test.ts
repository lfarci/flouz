import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parseDate,
  parseAmount,
  cleanCounterparty,
  pickCounterparty,
  parseBankCsv,
} from './bank'

const fixturePath = join(import.meta.dir, '__fixtures__/minimal.bank.csv')
const fixtureContent = readFileSync(fixturePath, 'utf-8')

describe('parseDate', () => {
  it('converts dd/MM/yyyy to yyyy-MM-dd', () => {
    expect(parseDate('27/01/2026')).toBe('2026-01-27')
  })
  it('handles single-digit day and month', () => {
    expect(parseDate('05/03/2025')).toBe('2025-03-05')
  })
})

describe('parseAmount', () => {
  it('parses negative comma-decimal amount', () => {
    expect(parseAmount('-32,41')).toBe(-32.41)
  })
  it('parses positive comma-decimal amount', () => {
    expect(parseAmount('3000,00')).toBe(3000)
  })
  it('parses whole number', () => {
    expect(parseAmount('100,00')).toBe(100)
  })
})

describe('cleanCounterparty', () => {
  it('strips PAIEMENT DEBITMASTERCARD prefix', () => {
    expect(cleanCounterparty('PAIEMENT DEBITMASTERCARD Some Shop')).toBe('Some Shop')
  })
  it('strips PAIEMENT DEBITMASTERCARD VIA Apple Pay prefix', () => {
    expect(cleanCounterparty('PAIEMENT DEBITMASTERCARD VIA Apple Pay Coffee Place')).toBe('Coffee Place')
  })
  it('strips BANCONTACT - ACHAT - prefix', () => {
    expect(cleanCounterparty('BANCONTACT - ACHAT - Test Supermarket')).toBe('Test Supermarket')
  })
  it('strips VIREMENT prefix', () => {
    expect(cleanCounterparty('VIREMENT ACME Shop')).toBe('ACME Shop')
  })
  it('strips DOMICILIATION prefix', () => {
    expect(cleanCounterparty('DOMICILIATION Fake Telecom monthly')).toBe('Fake Telecom monthly')
  })
  it("strips RETRAIT D'ESPECES prefix", () => {
    expect(cleanCounterparty("RETRAIT D'ESPECES ATM Brussels")).toBe('ATM Brussels')
  })
  it('returns unchanged string if no prefix matches', () => {
    expect(cleanCounterparty('EMPLOYER SA')).toBe('EMPLOYER SA')
  })
  it('trims whitespace', () => {
    expect(cleanCounterparty('  VIREMENT ACME  ')).toBe('ACME')
  })
})

describe('pickCounterparty', () => {
  it('prefers Nom contrepartie contient', () => {
    const row = {
      'Nom contrepartie contient': 'ACME Shop',
      'Transaction': 'VIREMENT ACME Shop',
      'Communications': 'Invoice',
    }
    expect(pickCounterparty(row)).toBe('ACME Shop')
  })
  it('falls back to Transaction when counterparty is empty', () => {
    const row = {
      'Nom contrepartie contient': '',
      'Transaction': 'BANCONTACT - ACHAT - Test Supermarket',
      'Communications': '',
    }
    expect(pickCounterparty(row)).toBe('Test Supermarket')
  })
  it('falls back to Communications as last resort', () => {
    const row = {
      'Nom contrepartie contient': '',
      'Transaction': '',
      'Communications': 'Some note',
    }
    expect(pickCounterparty(row)).toBe('Some note')
  })
})

describe('parseBankCsv', () => {
  it('parses minimal fixture and returns 5 transactions', () => {
    const txs = parseBankCsv(fixtureContent)
    expect(txs).toHaveLength(5)
  })
  it('skips metadata block', () => {
    const txs = parseBankCsv(fixtureContent)
    // All transactions should have valid dates, not metadata values
    for (const tx of txs) {
      expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
  it('parses date correctly', () => {
    const txs = parseBankCsv(fixtureContent)
    expect(txs[0].date).toBe('2026-01-15')
  })
  it('parses amount correctly', () => {
    const txs = parseBankCsv(fixtureContent)
    expect(txs[0].amount).toBe(-42.5)
    expect(txs[3].amount).toBe(3000)
  })
  it('strips counterparty prefix', () => {
    const txs = parseBankCsv(fixtureContent)
    // Row 2: Transaction is 'BANCONTACT - ACHAT - Test Supermarket', Nom contrepartie = 'Test Supermarket'
    expect(txs[1].counterparty).toBe('Test Supermarket')
    // Row 5: Transaction is 'PAIEMENT DEBITMASTERCARD VIA Apple Pay Coffee Place'
    expect(txs[4].counterparty).toBe('Coffee Place')
  })
  it('sets account from Compte column', () => {
    const txs = parseBankCsv(fixtureContent)
    expect(txs[0].account).toBe('BE00 0000 0000 0000')
  })
  it('sets counterpartyIban when present', () => {
    const txs = parseBankCsv(fixtureContent)
    expect(txs[0].counterpartyIban).toBe('BE11 1111 1111 1111')
    expect(txs[1].counterpartyIban).toBeUndefined()
  })
  it('sets sourceRef from extract and transaction numbers', () => {
    const txs = parseBankCsv(fixtureContent)
    expect(txs[0].sourceRef).toBe('1:1')
    expect(txs[3].sourceRef).toBe('2:1')
  })
  it('sets note from Communications', () => {
    const txs = parseBankCsv(fixtureContent)
    expect(txs[0].note).toBe('Invoice 2026-01')
    expect(txs[2].note).toBe('Monthly subscription')
    expect(txs[1].note).toBeUndefined()
  })
})
