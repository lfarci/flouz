import { describe, it, expect } from 'bun:test'
import { parseCsv } from './csv'

const FIXTURE_PATH = `${import.meta.dir}/__fixtures__/minimal.csv`

describe('parseCsv', () => {
  describe('happy path', () => {
    it('parses 5 transactions from fixture', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const { transactions } = parseCsv(content, FIXTURE_PATH)
      expect(transactions).toHaveLength(5)
    })

    it('maps required fields correctly', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const { transactions: [first] } = parseCsv(content)
      expect(first.date).toBe('2026-01-15')
      expect(first.amount).toBe(-42.5)
      expect(first.counterparty).toBe('ACME Shop')
    })

    it('maps optional fields when present', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const { transactions: [first] } = parseCsv(content)
      expect(first.counterpartyIban).toBe('BE00 0000 0000 0001')
      expect(first.currency).toBe('EUR')
      expect(first.accountKey).toBe('checking')
      expect(first.note).toBe('Invoice 42')
    })

    it('defaults currency to EUR when column is empty', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const { transactions } = parseCsv(content)
      const noExplicitCurrency = transactions[1]
      expect(noExplicitCurrency.currency).toBe('EUR')
    })

    it('sets optional fields to undefined when column is empty', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const { transactions } = parseCsv(content)
      const noOptionals = transactions[1]
      expect(noOptionals.counterpartyIban).toBeUndefined()
      expect(noOptionals.note).toBeUndefined()
    })

    it('sets sourceFile on every transaction', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const { transactions } = parseCsv(content, 'my-file.csv')
      for (const tx of transactions) {
        expect(tx.sourceFile).toBe('my-file.csv')
      }
    })

    it('sets importedAt to an ISO timestamp', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const { transactions: [first] } = parseCsv(content)
      expect(first.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('returns empty arrays for empty content', () => {
      expect(parseCsv('')).toEqual({ transactions: [], errors: [] })
    })

    it('returns empty arrays for header-only content', () => {
      expect(parseCsv('date,amount,counterparty')).toEqual({ transactions: [], errors: [] })
    })

    it('uses note as counterparty when counterparty column is empty', () => {
      const content = 'date,amount,counterparty,note\n2026-01-15,-20.00,,RETRAIT ESPECES ATM BRUSSELS'
      const { transactions, errors } = parseCsv(content)
      expect(errors).toHaveLength(0)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].counterparty).toBe('RETRAIT ESPECES ATM BRUSSELS')
    })

    it('preserves note field when note is used as counterparty fallback', () => {
      const content = 'date,amount,counterparty,note\n2026-01-15,-20.00,,PAIEMENT MAESTRO DELHAIZE'
      const { transactions: [tx] } = parseCsv(content)
      expect(tx.counterparty).toBe('PAIEMENT MAESTRO DELHAIZE')
      expect(tx.note).toBe('PAIEMENT MAESTRO DELHAIZE')
    })

    it('ignores blank lines between data rows', () => {
      const content = `date,amount,counterparty
2026-01-15,-42.50,ACME Shop

2026-01-16,25.00,Salary`
      const { transactions, errors } = parseCsv(content)
      expect(transactions).toHaveLength(2)
      expect(errors).toHaveLength(0)
    })
  })

  describe('error cases', () => {
    it('throws when date column is missing', () => {
      const content = 'amount,counterparty\n-10.00,ACME Shop'
      expect(() => parseCsv(content)).toThrow('Missing required column: "date"')
    })

    it('throws when amount column is missing', () => {
      const content = 'date,counterparty\n2026-01-15,ACME Shop'
      expect(() => parseCsv(content)).toThrow('Missing required column: "amount"')
    })

    it('throws when counterparty column is missing', () => {
      const content = 'date,amount\n2026-01-15,-10.00'
      expect(() => parseCsv(content)).toThrow('Missing required column: "counterparty"')
    })

    it('collects invalid date format in errors', () => {
      const content = 'date,amount,counterparty\n15/01/2026,-10.00,ACME Shop'
      const { transactions, errors } = parseCsv(content)
      expect(transactions).toHaveLength(0)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('date must be YYYY-MM-DD')
      expect(errors[0].row).toBe(2)
    })

    it('collects non-numeric amount in errors', () => {
      const content = 'date,amount,counterparty\n2026-01-15,ten,ACME Shop'
      const { transactions, errors } = parseCsv(content)
      expect(transactions).toHaveLength(0)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('amount must be a decimal number')
    })

    it('collects error when counterparty and note are both empty', () => {
      const content = 'date,amount,counterparty,note\n2026-01-15,-10.00,,'
      const { transactions, errors } = parseCsv(content)
      expect(transactions).toHaveLength(0)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('counterparty and note are both empty')
    })

    it('collects row with all fields empty in errors', () => {
      const content = 'date,amount,counterparty\n,,'
      const { transactions, errors } = parseCsv(content)
      expect(transactions).toHaveLength(0)
      expect(errors).toHaveLength(1)
    })

    it('parses valid rows and collects errors from invalid rows', () => {
      const content = `date,amount,counterparty
2026-01-15,-42.50,ACME Shop
15/01/2026,-10.00,Bad Date
2026-01-16,25.00,Salary`
      const { transactions, errors } = parseCsv(content)
      expect(transactions).toHaveLength(2)
      expect(errors).toHaveLength(1)
      expect(errors[0].row).toBe(3)
    })
  })

  describe('RFC 4180 compliance', () => {
    it('handles quoted fields containing commas', () => {
      const content = 'date,amount,counterparty\n2026-01-15,-10.00,"Smith, John"'
      const { transactions: [tx] } = parseCsv(content)
      expect(tx.counterparty).toBe('Smith, John')
    })

    it('handles doubled quotes inside quoted fields', () => {
      const content = 'date,amount,counterparty\n2026-01-15,-10.00,"O\'Brien""s Shop"'
      const { transactions: [tx] } = parseCsv(content)
      expect(tx.counterparty).toBe("O'Brien\"s Shop")
    })
  })
})
