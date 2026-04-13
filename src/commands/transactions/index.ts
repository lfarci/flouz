import { Command } from 'commander'
import { resolveDbPath } from '@/config'
import { createImportCommand } from './import'
import { createListCommand } from './list'

export async function createTransactionsCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('transactions')
    .description('Manage stored transactions')
    .addCommand(createImportCommand(defaultDb))
    .addCommand(createListCommand(defaultDb))
}