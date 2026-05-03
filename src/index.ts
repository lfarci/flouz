#!/usr/bin/env bun
import { Command } from 'commander'
import { version } from '../package.json'
import { createAccountsCommand } from './commands/accounts'
import { createBudgetCommand } from './commands/budget'
import { createConfigCommand } from './commands/config'
import { createTransactionsCommand } from './commands/transactions'

const program = new Command()

program
  .name('flouz')
  .description('AI-powered personal finance CLI for bank transactions')
  .version(version, '-v, --version', 'display version number')

program.addCommand(await createTransactionsCommand())
program.addCommand(await createAccountsCommand())
program.addCommand(await createBudgetCommand())
program.addCommand(createConfigCommand())

program.parse()
