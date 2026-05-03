import { Command } from 'commander'
import { createSetTotalCommand } from './set'
import { createShowTotalCommand } from './show'

export function createTotalCommand(defaultDb: string): Command {
  return new Command('total')
    .description('Manage the monthly income total')
    .addCommand(createSetTotalCommand(defaultDb))
    .addCommand(createShowTotalCommand(defaultDb), { isDefault: true })
}
