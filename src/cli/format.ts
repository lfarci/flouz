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
