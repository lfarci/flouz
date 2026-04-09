import { z } from 'zod'
import type { NewTransaction } from '@/types'

export type ParseError = { row: number; message: string }
export type ParseResult = { transactions: NewTransaction[]; errors: ParseError[] }

const rowSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  amount: z
    .string()
    .refine(v => !isNaN(parseFloat(v)), { message: 'amount must be a decimal number' })
    .transform(v => parseFloat(v)),
  counterparty: z.string().optional().default(''),
  counterparty_iban: z.string().optional().default(''),
  currency: z.string().optional().transform(v => v || 'EUR'),
  account: z.string().optional().default(''),
  note: z.string().optional().default(''),
})

type RawRow = Record<string, string>

function parseRow(row: RawRow, sourceFile?: string): NewTransaction {
  const result = rowSchema.safeParse(row)
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message).join('; ')
    throw new Error(messages)
  }

  const data = result.data
  const counterparty = data.counterparty || data.note
  if (!counterparty) {
    throw new Error('counterparty and note are both empty — cannot identify transaction')
  }

  return {
    date: data.date,
    amount: data.amount,
    counterparty,
    counterpartyIban: data.counterparty_iban || undefined,
    currency: data.currency,
    account: data.account || undefined,
    note: data.note || undefined,
    sourceFile,
    importedAt: new Date().toISOString(),
  }
}

export function parseCsv(content: string, sourceFile?: string): ParseResult {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return { transactions: [], errors: [] }

  const headers = lines[0].split(',').map(h => h.trim())
  const required = ['date', 'amount', 'counterparty']
  for (const field of required) {
    if (!headers.includes(field)) {
      throw new Error(`Missing required column: "${field}"`)
    }
  }

  const transactions: NewTransaction[] = []
  const errors: ParseError[] = []

  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = splitCsvLine(lines[i])
      const row: RawRow = {}
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cols[j] ?? ''
      }
      transactions.push(parseRow(row, sourceFile))
    } catch (error) {
      errors.push({ row: i + 1, message: error instanceof Error ? error.message : String(error) })
    }
  }

  return { transactions, errors }
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
