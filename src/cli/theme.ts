import pc from 'picocolors'

export const ICON_ACTIVE = '●'
export const ICON_PENDING = '○'
export const ICON_SUCCESS = '✓'
export const ICON_REJECTED = '✗'
export const ICON_EMPTY = '—'

// picocolors caches NO_COLOR at import time, so the --no-color flag
// (set via preAction hook) would have no effect. Check at call time instead.
function colorsEnabled(): boolean {
  return process.env.NO_COLOR === undefined
}

export function colorAmount(amount: number, formatted: string): string {
  if (!colorsEnabled()) return formatted
  return amount >= 0 ? pc.green(formatted) : pc.red(formatted)
}

export function colorConfidence(confidence: number, formatted: string): string {
  if (!colorsEnabled()) return formatted
  if (confidence >= 0.75) {
    return pc.green(formatted)
  } else if (confidence >= 0.5) {
    return pc.dim(formatted)
  } else {
    return pc.yellow(formatted)
  }
}

export function formatStatus(status: 'pending' | 'approved' | 'applied' | 'rejected'): string {
  if (!colorsEnabled()) {
    const icons = { pending: ICON_PENDING, approved: ICON_ACTIVE, applied: ICON_SUCCESS, rejected: ICON_REJECTED }
    return `${icons[status]} ${status}`
  }
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
