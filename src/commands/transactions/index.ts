import { Command } from 'commander'
import { resolveDbPath } from '@/config'
import { createCategorizeCommand } from './categorize'
import { createImportCommand } from './import'
import { createListCommand } from './list'

export async function createTransactionsCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('transactions')
    .description('Manage stored transactions')
    .addCommand(createImportCommand(defaultDb))
    .addCommand(createCategorizeCommand(defaultDb))
    .addCommand(createListCommand(defaultDb))
}
