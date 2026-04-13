import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { getCategories } from '@/db/categories/queries'
import { seedCategories } from '@/db/categories/seed'
import { initDb } from '@/db/schema'
import { insertTransaction } from '@/db/transactions/mutations'
import {
  buildCsv,
  buildJson,
  escapeCsvField,
  findCategoryId,
  formatTransactionTable,
  parseOutputFormat,
} from './list'
import { isBrokenPipeError } from '@/cli/stdout'

describe('findCategoryId', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('returns the matching category id for a slug', () => {
    const categories = getCategories(db)

    const categoryId = findCategoryId(categories, 'groceries')

    expect(categoryId).toBeDefined()
    expect(categories.some(category => category.id === categoryId)).toBe(true)
  })

  it('throws when the category slug is unknown', () => {
    const categories = getCategories(db)

    expect(() => findCategoryId(categories, 'missing')).toThrow('Unknown category slug: missing')
  })
})

describe('formatTransactionTable', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)
    seedCategories(db)
  })

  it('formats a boxed table with aligned columns', () => {
    const lines = formatTransactionTable([
      {
        date: '2026-01-15',
        amount: '-42.50',
        counterparty: 'ACME Shop',
        note: 'Invoice 42',
        category: 'groceries',
      },
    ])
    const renderedTable = lines
      .join(' ')
      .replace(/[│╭╮╰╯├┤┬┴┼─]/g, ' ')
      .replace(/\s+/g, ' ')

    expect(lines[0]).toMatch(/^╭/)
    expect(lines[1]).toContain('Date')
    expect(lines[2]).toMatch(/^├/)
    expect(renderedTable).toContain('2026-01-15')
    expect(renderedTable).toContain('-42.50')
    expect(renderedTable).toContain('ACME Shop')
    expect(renderedTable).toContain('Invoice 42')
    expect(renderedTable).toContain('groceries')
    expect(lines[lines.length - 1]).toMatch(/^╰/)
  })
})

describe('parseOutputFormat', () => {
  it('accepts the supported output formats', () => {
    expect(parseOutputFormat('table')).toBe('table')
    expect(parseOutputFormat('csv')).toBe('csv')
    expect(parseOutputFormat('json')).toBe('json')
  })

  it('throws on unsupported formats', () => {
    expect(() => parseOutputFormat('yaml')).toThrow(
      'Invalid output format: yaml. Use table, csv, or json.'
    )
  })
})

describe('buildCsv', () => {
  it('serializes full counterparty and note fields', () => {
    expect(
      buildCsv([
        {
          date: '2026-01-15',
          amount: '-42.50',
          counterparty: 'ACME Shop and Bakery',
          note: 'Monthly, refill',
          category: 'groceries',
        },
      ])
    ).toBe([
      'date,amount,counterparty,note,category',
      '2026-01-15,-42.50,ACME Shop and Bakery,"Monthly, refill",groceries',
    ].join('\n'))
  })
})

describe('escapeCsvField', () => {
  it('escapes commas and quotes', () => {
    expect(escapeCsvField('Shop, "Ltd"')).toBe('"Shop, ""Ltd"""')
  })
})

describe('buildJson', () => {
  it('serializes rows as pretty JSON', () => {
    expect(
      buildJson([
        {
          date: '2026-01-15',
          amount: '-42.50',
          counterparty: 'ACME Shop and Bakery',
          note: 'Invoice 42 paid in full',
          category: 'groceries',
        },
      ])
    ).toBe([
      '[',
      '  {',
      '    "date": "2026-01-15",',
      '    "amount": "-42.50",',
      '    "counterparty": "ACME Shop and Bakery",',
      '    "note": "Invoice 42 paid in full",',
      '    "category": "groceries"',
      '  }',
      ']',
    ].join('\n'))
  })
})

describe('isBrokenPipeError', () => {
  it('returns true for EPIPE errors', () => {
    const error = new Error('broken pipe') as Error & { code?: string }
    error.code = 'EPIPE'

    expect(isBrokenPipeError(error)).toBe(true)
  })

  it('returns false for other errors', () => {
    expect(isBrokenPipeError(new Error('other'))).toBe(false)
  })
})