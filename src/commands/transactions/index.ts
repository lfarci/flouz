import { Command } from 'commander'
import { resolveDbPath } from '@/config'
import { createCategoriesCommand } from './categories/index'
import { createCategorizeCommand } from './categorize'
import { createImportCommand } from './import'
import { createListCommand } from './list'
import { createSuggestionsCommand } from './suggestions/index'

export async function createTransactionsCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('transactions')
    .description('Manage stored transactions')
    .addCommand(createImportCommand(defaultDb))
    .addCommand(createCategorizeCommand(defaultDb))
    .addCommand(createListCommand(defaultDb))
    .addCommand(createCategoriesCommand(defaultDb))
    .addCommand(createSuggestionsCommand(defaultDb))
}
