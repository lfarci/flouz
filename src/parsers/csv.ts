import { z } from 'zod'
import type { Transaction } from '@/types'

const rowSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  amount: z
    .string()
    .refine(v => !isNaN(parseFloat(v)), { message: 'amount must be a decimal number' })
    .transform(v => parseFloat(v)),
  counterparty: z.string().min(1, 'counterparty must not be empty'),
  counterparty_iban: z.string().optional().default(''),
  currency: z.string().optional().transform(v => v || 'EUR'),
  account: z.string().optional().default(''),
  note: z.string().optional().default(''),
})

type RawRow = Record<string, string>

function parseRow(row: RawRow, index: number, sourceFile?: string): Transaction {
  const result = rowSchema.safeParse(row)
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message).join('; ')
    throw new Error(`Row ${index + 1}: ${messages}`)
  }

  const data = result.data
  return {
    date: data.date,
    amount: data.amount,
    counterparty: data.counterparty,
    counterpartyIban: data.counterparty_iban || undefined,
    currency: data.currency,
    account: data.account || undefined,
    note: data.note || undefined,
    sourceFile,
    importedAt: new Date().toISOString(),
  }
}

export function parseCsv(content: string, sourceFile?: string): Transaction[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const required = ['date', 'amount', 'counterparty']
  for (const field of required) {
    if (!headers.includes(field)) {
      throw new Error(`Missing required column: "${field}"`)
    }
  }

  const transactions: Transaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const row: RawRow = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cols[j] ?? ''
    }
    transactions.push(parseRow(row, i - 1, sourceFile))
  }

  return transactions
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
