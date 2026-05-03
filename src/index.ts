#!/usr/bin/env bun
import { Command } from 'commander'
import { version } from '../package.json'
import { createAccountsCommand } from './commands/accounts'
import { createConfigCommand } from './commands/config'
import { createTransactionsCommand } from './commands/transactions'

const program = new Command()

program
  .name('flouz')
  .description('AI-powered personal finance CLI for bank transactions')
  .version(version, '-v, --version', 'display version number')
  .option('--no-color', 'Disable colored output')

program.hook('preAction', (thisCommand) => {
  if (thisCommand.opts().noColor) {
    process.env.NO_COLOR = '1'
  }
})

program.addCommand(await createTransactionsCommand())
program.addCommand(await createAccountsCommand())
program.addCommand(createConfigCommand())

program.parse()
