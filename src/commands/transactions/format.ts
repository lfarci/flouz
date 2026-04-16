import { renderCliTable } from '@/cli/table'

export interface ListRow {
  date: string
  amount: string
  counterparty: string
  note: string
  category: string
}

export function formatTransactionTable(rows: ListRow[]): string[] {
  return renderCliTable({
    columns: [
      { header: 'Date', width: 10, minWidth: 10, truncate: 10 },
      { header: 'Amount', width: 12, minWidth: 10, alignment: 'right', truncate: 12 },
      { header: 'Counterparty', width: 30, minWidth: 16, wrapWord: true },
      { header: 'Note', width: 30, minWidth: 14, wrapWord: true },
      { header: 'Category', width: 18, minWidth: 10, wrapWord: true },
    ],
    rows: rows.map((row) => [row.date, row.amount, row.counterparty, row.note, row.category]),
  })
}

export function buildCsv(rows: ListRow[]): string {
  const header = 'date,amount,counterparty,note,category'
  const dataRows = rows.map((row) =>
    [row.date, row.amount, row.counterparty, row.note, row.category].map(escapeCsvField).join(','),
  )
  return [header, ...dataRows].join('\n')
}

export function escapeCsvField(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replaceAll('"', '""')}"`
}

export function buildJson(rows: ListRow[]): string {
  return JSON.stringify(rows, undefined, 2)
}
