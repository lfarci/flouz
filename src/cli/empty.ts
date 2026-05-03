import { log } from '@clack/prompts'
import pc from 'picocolors'

export function emptyState(message: string, hint?: string): void {
  log.info(message)
  if (hint !== undefined) {
    log.info(pc.dim(hint))
  }
}
