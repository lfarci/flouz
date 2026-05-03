import { Command } from 'commander'
import { resolveDbPath } from '@/config'
import { createSetBudgetCommand } from './set'
import { createListBudgetCommand } from './list'
import { createCheckBudgetCommand } from './check'
import { createTotalCommand } from './total'

export async function createBudgetCommand(): Promise<Command> {
  const defaultDb = await resolveDbPath()
  return new Command('budget')
    .description('Manage monthly budgets and track spending')
    .addCommand(createSetBudgetCommand(defaultDb))
    .addCommand(createListBudgetCommand(defaultDb))
    .addCommand(createCheckBudgetCommand(defaultDb))
    .addCommand(createTotalCommand(defaultDb))
}
