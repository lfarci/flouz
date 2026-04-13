import { describe, expect, it } from 'bun:test'

describe('createTransactionsCommand', () => {
  it('registers all transaction subcommands', async () => {
    const { createTransactionsCommand } = await import('.')

    const command = await createTransactionsCommand()
    const subcommandNames = command.commands.map(subcommand => subcommand.name())

    expect(subcommandNames).toEqual(['import', 'export', 'list'])
  })
})