import { Command } from 'commander'
import { createListSuggestionsCommand } from './list'
import { createApproveCommand } from './approve'
import { createRejectCommand } from './reject'
import { createApplyCommand } from './apply'
import { createFixCommand } from './fix'

export function createSuggestionsCommand(defaultDb: string): Command {
  return new Command('suggestions')
    .description('Review and apply AI-generated transaction category suggestions')
    .addCommand(createListSuggestionsCommand(defaultDb))
    .addCommand(createApproveCommand(defaultDb))
    .addCommand(createRejectCommand(defaultDb))
    .addCommand(createFixCommand(defaultDb))
    .addCommand(createApplyCommand(defaultDb))
}
