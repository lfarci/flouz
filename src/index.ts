import { Command } from 'commander'

const program = new Command()

program
  .name('flouz')
  .description('AI-powered personal finance CLI for Belgian bank transactions')
  .version('0.1.0')

program.parse()
