import { describe, expect, it } from 'bun:test'
import { formatAccountsTable } from '.'

describe('formatAccountsTable', () => {
  it('formats accounts into a printable table', () => {
    const lines = formatAccountsTable([
      {
        id: 1,
        key: 'checking',
        name: 'Main account',
        company: 'Belfius',
        iban: 'BE00 0000 0000 0000',
      },
    ])

    expect(lines[0]).toBe(lines[2])
    expect(lines[1]).toContain('Key')
    expect(lines[3]).toContain('checking')
    expect(lines[3]).toContain('Main account')
    expect(lines[3]).toContain('Belfius')
    expect(lines[4]).toBe(lines[0])
  })

  it('shows a placeholder when iban is missing', () => {
    const lines = formatAccountsTable([
      {
        id: 1,
        key: 'wallet',
        name: 'Meal vouchers',
        company: 'Pluxee',
      },
    ])

    expect(lines[3]).toContain('—')
  })

  it('supports the delete command in the CLI surface', async () => {
    const { createAccountsCommand } = await import('.')

    const command = await createAccountsCommand()
    const subcommandNames = command.commands.map(subcommand => subcommand.name())

    expect(subcommandNames).toContain('delete')
  })
})