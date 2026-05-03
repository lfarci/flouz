export function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}${amount.toFixed(2)}`
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

export function truncateWithEllipsis(text: string, maxLength: number): string {
  if (maxLength < 2) return text
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export function formatEuro(amount: number): string {
  return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatEuroDecimal(amount: number): string {
  return `€${Math.abs(amount).toFixed(2)}`
}
