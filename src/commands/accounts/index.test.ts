import { describe, expect, it } from 'bun:test'

describe('createAccountsCommand', () => {
  it('registers all account management subcommands', async () => {
    const { createAccountsCommand } = await import('.')

    const command = await createAccountsCommand()
    const subcommandNames = command.commands.map((subcommand) =>
      subcommand.name(),
    )

    expect(subcommandNames).toEqual(['add', 'delete', 'list'])
  })
})
