import pc from 'picocolors'

export const ICON_ACTIVE = '●'
export const ICON_PENDING = '○'
export const ICON_SUCCESS = '✓'
export const ICON_REJECTED = '✗'
export const ICON_EMPTY = '—'

export function colorAmount(amount: number, formatted: string): string {
  return amount >= 0 ? pc.green(formatted) : pc.red(formatted)
}

export function colorConfidence(confidence: number, formatted: string): string {
  if (confidence >= 0.75) {
    return pc.green(formatted)
  } else if (confidence >= 0.5) {
    return pc.dim(formatted)
  } else {
    return pc.yellow(formatted)
  }
}

export function formatStatus(status: 'pending' | 'approved' | 'applied' | 'rejected'): string {
  switch (status) {
    case 'pending':
      return `${pc.dim(ICON_PENDING)} ${pc.dim('pending')}`
    case 'approved':
      return `${pc.green(ICON_ACTIVE)} ${pc.green('approved')}`
    case 'applied':
      return `${pc.blue(ICON_SUCCESS)} ${pc.blue('applied')}`
    case 'rejected':
      return `${pc.red(ICON_REJECTED)} ${pc.red('rejected')}`
  }
}
