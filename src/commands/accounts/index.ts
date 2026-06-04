import { Command } from 'commander'
import { resolveDbPath } from '@/config'
import { createAddAccountsCommand } from './add'
import { createBalanceAccountsCommand } from './balance'
import { createDeleteAccountsCommand } from './delete'
import { createHistoryAccountsCommand } from './history'
import { createListAccountsCommand } from './list'
import { createSnapshotAccountsCommand } from './snapshot'

export async function createAccountsCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('accounts')
    .description('Manage configured accounts')
    .addCommand(createAddAccountsCommand(defaultDb))
    .addCommand(createSnapshotAccountsCommand(defaultDb))
    .addCommand(createBalanceAccountsCommand(defaultDb))
    .addCommand(createHistoryAccountsCommand(defaultDb))
    .addCommand(createDeleteAccountsCommand(defaultDb))
    .addCommand(createListAccountsCommand(defaultDb))
}
