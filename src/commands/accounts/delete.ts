import { log } from '@clack/prompts'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { deleteAccountByKey } from '@/db/accounts/mutations'
import { getAccountByKey } from '@/db/accounts/queries'
import { openDatabase } from '@/db/schema'
import { hasTransactionsForAccount } from '@/db/transactions/queries'

type DeleteAccountOptions = {
  db: string
}

function requireAccountKey(value: string): string {
  const normalizedValue = value.trim()

  if (normalizedValue.length === 0) {
    throw new Error('Account key cannot be empty')
  }

  return normalizedValue
}

async function deleteAccountAction(key: string, options: DeleteAccountOptions): Promise<void> {
  const database = openDatabase(resolve(options.db))

  try {
    const normalizedKey = requireAccountKey(key)
    const account = getAccountByKey(database, normalizedKey)

    if (account === undefined) {
      throw new Error(`Unknown account key: ${normalizedKey}`)
    }

    if (hasTransactionsForAccount(database, account.id)) {
      throw new Error(`Cannot delete account ${normalizedKey}: it is referenced by transactions.`)
    }

    deleteAccountByKey(database, normalizedKey)
    log.success(`Deleted account ${normalizedKey}`)
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    database.close()
  }
}

export function createDeleteAccountsCommand(defaultDb: string): Command {
  return new Command('delete')
    .description('Delete a configured account by key')
    .argument('<key>', 'unique import key')
    .option('--db <path>', 'SQLite database path', defaultDb)
    .action(deleteAccountAction)
}
