import { describe, it, expect } from 'bun:test'
import { parseCsv } from './csv'

const FIXTURE_PATH = `${import.meta.dir}/__fixtures__/minimal.csv`

describe('parseCsv', () => {
  describe('happy path', () => {
    it('parses 5 transactions from fixture', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const transactions = parseCsv(content, FIXTURE_PATH)
      expect(transactions).toHaveLength(5)
    })

    it('maps required fields correctly', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const [first] = parseCsv(content)
      expect(first.date).toBe('2026-01-15')
      expect(first.amount).toBe(-42.5)
      expect(first.counterparty).toBe('ACME Shop')
    })

    it('maps optional fields when present', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const [first] = parseCsv(content)
      expect(first.counterpartyIban).toBe('BE00 0000 0000 0001')
      expect(first.currency).toBe('EUR')
      expect(first.account).toBe('BE11 1111 1111 1111')
      expect(first.note).toBe('Invoice 42')
    })

    it('defaults currency to EUR when column is empty', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const transactions = parseCsv(content)
      const noExplicitCurrency = transactions[1]
      expect(noExplicitCurrency.currency).toBe('EUR')
    })

    it('sets optional fields to undefined when column is empty', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const transactions = parseCsv(content)
      const noOptionals = transactions[1]
      expect(noOptionals.counterpartyIban).toBeUndefined()
      expect(noOptionals.note).toBeUndefined()
    })

    it('sets sourceFile on every transaction', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const transactions = parseCsv(content, 'my-file.csv')
      for (const tx of transactions) {
        expect(tx.sourceFile).toBe('my-file.csv')
      }
    })

    it('sets importedAt to an ISO timestamp', async () => {
      const content = await Bun.file(FIXTURE_PATH).text()
      const [first] = parseCsv(content)
      expect(first.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('returns empty array for empty content', () => {
      expect(parseCsv('')).toEqual([])
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

    it('throws on invalid date format', () => {
      const content = 'date,amount,counterparty\n15/01/2026,-10.00,ACME Shop'
      expect(() => parseCsv(content)).toThrow('date must be YYYY-MM-DD')
    })

    it('throws on non-numeric amount', () => {
      const content = 'date,amount,counterparty\n2026-01-15,ten,ACME Shop'
      expect(() => parseCsv(content)).toThrow('amount must be a decimal number')
    })

    it('throws on empty counterparty', () => {
      const content = 'date,amount,counterparty\n2026-01-15,-10.00,'
      expect(() => parseCsv(content)).toThrow('counterparty must not be empty')
    })
  })

  describe('RFC 4180 compliance', () => {
    it('handles quoted fields containing commas', () => {
      const content = 'date,amount,counterparty\n2026-01-15,-10.00,"Smith, John"'
      const [tx] = parseCsv(content)
      expect(tx.counterparty).toBe('Smith, John')
    })

    it('handles doubled quotes inside quoted fields', () => {
      const content = 'date,amount,counterparty\n2026-01-15,-10.00,"O\'Brien""s Shop"'
      const [tx] = parseCsv(content)
      expect(tx.counterparty).toBe("O'Brien\"s Shop")
    })
  })
})
