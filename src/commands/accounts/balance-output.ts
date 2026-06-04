import { renderCliTable } from '@/cli/table'
import type { BalanceHistoryPoint, DerivedAccountBalance } from '@/types'
import { escapeCsvField } from '@/commands/transactions/format'

export type BalanceHistoryRow = {
  account: string
  date: string
  amount: string
  snapshotDate: string
  direction: string
}

export function formatAmountWithCurrency(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`
}

export function formatDerivedBalance(accountKey: string, balance: DerivedAccountBalance): string {
  const amount = formatAmountWithCurrency(balance.amount, balance.currency)
  return `${accountKey} balance on ${balance.date}: ${amount} (snapshot ${balance.snapshotDate})`
}

export function toBalanceHistoryRow(accountKey: string, point: BalanceHistoryPoint): BalanceHistoryRow {
  return {
    account: accountKey,
    date: point.date,
    amount: formatAmountWithCurrency(point.amount, point.currency),
    snapshotDate: point.snapshotDate,
    direction: point.direction,
  }
}

export function formatBalanceHistoryTable(rows: BalanceHistoryRow[]): string[] {
  return renderCliTable({
    columns: [
      { header: 'Account', width: 18, minWidth: 12, truncate: 18 },
      { header: 'Date', width: 10, minWidth: 10, truncate: 10 },
      { header: 'Balance', width: 14, minWidth: 12, alignment: 'right' },
      { header: 'Snapshot', width: 10, minWidth: 10, truncate: 10 },
      { header: 'Mode', width: 8, minWidth: 7, truncate: 8 },
    ],
    rows: rows.map((row) => [row.account, row.date, row.amount, row.snapshotDate, row.direction]),
  })
}

export function buildBalanceHistoryCsv(rows: BalanceHistoryRow[]): string {
  const header = 'account,date,amount,snapshotDate,direction'
  const dataRows = rows.map((row) =>
    [row.account, row.date, row.amount, row.snapshotDate, row.direction].map(escapeCsvField).join(','),
  )
  return [header, ...dataRows].join('\n')
}

export function buildBalanceHistoryJson(rows: BalanceHistoryRow[]): string {
  return JSON.stringify(rows, undefined, 2)
}
