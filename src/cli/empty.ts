import { log } from '@clack/prompts'
import pc from 'picocolors'
import { colorsEnabled } from '@/cli/theme'

export function emptyState(message: string, hint?: string): void {
  log.info(message)
  if (hint !== undefined) {
    log.info(colorsEnabled() ? pc.dim(hint) : hint)
  }
}
