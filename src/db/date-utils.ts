export interface MonthDateRange {
  startDate: string
  endDate: string
}

export function monthDateRange(month: string): MonthDateRange {
  const [year, monthNumber] = month.split('-').map(Number)
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1
  const nextYear = monthNumber === 12 ? year + 1 : year
  return {
    startDate: `${year}-${String(monthNumber).padStart(2, '0')}-01`,
    endDate: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  }
}
