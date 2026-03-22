import { Command } from 'commander'

export function createImportCommand(): Command {
  return new Command('import')
    .description('Import transactions from a bank CSV file')
    .argument('<file>', 'path to CSV file')
    .action(async (_file: string) => {
      console.log('import command — not yet implemented')
    })
}
