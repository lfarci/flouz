import { Command } from 'commander'
import { createImportCommand } from './commands/import'
import { createListCommand } from './commands/list'
import { createExportCommand } from './commands/export'

const program = new Command()

program
  .name('flouz')
  .description('AI-powered personal finance CLI for bank transactions')
  .version('0.1.0')

program.addCommand(createImportCommand())
program.addCommand(createListCommand())
program.addCommand(createExportCommand())

program.parse()
