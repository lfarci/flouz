#!/usr/bin/env bun
import { Command } from 'commander'
import { version } from '../package.json'
import { createImportCommand } from './commands/import'
import { createListCommand } from './commands/list'
import { createExportCommand } from './commands/export'
import { createConfigCommand } from './commands/config'

const program = new Command()

program
  .name('flouz')
  .description('AI-powered personal finance CLI for bank transactions')
  .version(version, '-v, --version', 'display version number')

program.addCommand(await createImportCommand())
program.addCommand(await createListCommand())
program.addCommand(await createExportCommand())
program.addCommand(createConfigCommand())

program.parse()
