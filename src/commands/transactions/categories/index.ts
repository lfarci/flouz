import { Command } from 'commander'
import { createListCategoriesCommand } from './list'

export function createCategoriesCommand(defaultDb: string): Command {
  return new Command('categories')
    .description('Manage transaction categories')
    .addCommand(createListCategoriesCommand(defaultDb))
}
