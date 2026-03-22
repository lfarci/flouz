#!/usr/bin/env bun
import { Command } from 'commander'
import { createImportCommand } from './commands/import'
import { createListCommand } from './commands/list'
import { createExportCommand } from './commands/export'
import { createConfigCommand } from './commands/config'

const program = new Command()

program
  .name('flouz')
  .description('AI-powered personal finance CLI for bank transactions')
  .version('0.1.0')

program.addCommand(await createImportCommand())
program.addCommand(await createListCommand())
program.addCommand(await createExportCommand())
program.addCommand(createConfigCommand())

program.parse()
