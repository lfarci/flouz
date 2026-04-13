import { Command } from 'commander'
import { resolveDbPath } from '@/config'
import { createAddAccountsCommand } from './add'
import { createDeleteAccountsCommand } from './delete'
import { createListAccountsCommand } from './list'

export async function createAccountsCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('accounts')
    .description('Manage configured accounts')
    .addCommand(createAddAccountsCommand(defaultDb))
    .addCommand(createDeleteAccountsCommand(defaultDb))
    .addCommand(createListAccountsCommand(defaultDb))
}