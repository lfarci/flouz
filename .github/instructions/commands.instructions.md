---
applyTo: 'src/commands/**/*.ts'
description: 'Conventions for structuring CLI commands in the flouz project'
---

# Command Structure Conventions

## Directory Layout

Commands use one of two layouts under `src/commands/`:

```
src/commands/
  config/
    index.ts        ← standalone command factory + helpers
    index.test.ts   ← tests for the standalone command
    README.md
  accounts/
    index.ts        ← parent command group factory
    index.test.ts   ← tests for parent registration
    README.md       ← group overview
    add.ts          ← leaf subcommand factory + helpers
    add.test.ts     ← tests for the `add` subcommand
    delete.ts
    delete.test.ts
    list.ts
    list.test.ts
```

- Standalone commands keep their factory in `index.ts`.
- Command groups keep the parent factory in `index.ts` and each leaf subcommand in a sibling `<name>.ts` file.
- Prefer the grouped layout when a command owns subcommands, as in `accounts` and `transactions`.

## File Responsibilities

### `index.ts`

- For standalone commands, exports one `create<Name>Command(): Command | Promise<Command>` factory function
- For command groups, exports only the parent `create<Name>Command(): Promise<Command>` factory that wires child commands together
- No business logic in the factory itself — it only wires up Commander options or child commands

### Leaf subcommand files (`add.ts`, `import.ts`, etc.)

- Export one `create<Name>Command(defaultDb: string): Command` factory function
- Contain the private `<name>Action(...)` function passed to `.action()`
- Extract each logical phase into named helpers (~20 lines max)
- Hold the command-specific logic that would otherwise bloat a parent `index.ts`

### `index.test.ts`

- For standalone commands and command groups, stays co-located with `index.ts`
- Imports from `'.'` (the sibling `index.ts`)
- Parent command tests focus on subcommand registration rather than leaf command logic

### Leaf subcommand tests (`add.test.ts`, `import.test.ts`, etc.)

- Live next to the leaf subcommand file
- Import from `'./<name>'`
- Test helper functions and pipeline logic in isolation (no process spawning)

## Command Test Structure

- Split command tests into separate `describe(...)` blocks for command creation and action/core logic
- Command creation tests should verify one thing per test (for example: command name, one positional argument, one option)
- For positional arguments, test each argument setup individually using the Commander argument metadata: name, required flag, description, and variadic flag
- Action tests should execute the actual Commander action through `parseAsync(...)` instead of calling private handlers directly
- When testing a subcommand `Command` instance directly, call `parseAsync(...)` with only that subcommand's arguments and options
- Keep tests to a single `expect(...)` per test case when practical; if a command action has multiple observable outcomes, collect them into one small result object and assert once on that object

## Command Test Isolation

- If a command opens its own database handle, mock the database factory so the test can inject a controlled in-memory database
- For `bun:sqlite`, do not Proxy-wrap `Database` instances in tests; use a plain object with bound methods when you need to stub `close()` or other members
- Extract repeated query row shapes and fixture result shapes into named `type` aliases instead of repeating inline object types across a test file
- When testing expected Commander parse failures (such as missing required arguments), silence command output with `command.configureOutput(...)` so test runs do not print expected error noise
- Prefer asserting on observable outcomes such as stored rows, normalized values, and row counts; avoid asserting on mock call details unless the call itself is the behavior under test

## Command Action Coverage

- Cover missing required positional arguments individually
- Cover blank required values individually
- Cover blank optional values individually
- Cover the minimal valid invocation with only required arguments
- Cover normalization of trimmed required and optional values
- Cover duplicate rejection both for exact duplicates and duplicates that only appear after normalization

## Naming Rules

- Command factories: `createImportCommand`, `createListCommand`, etc.
- Action handlers: `importAction`, `listAction`, etc. (private, not exported)
- Phase helpers: descriptive verb phrases — `parseAllFiles`, `insertAllTransactions`, `reportResults`
- Parent group factories: `createAccountsCommand`, `createTransactionsCommand`, etc.
- No abbreviations in any identifier (see object-calisthenics.instructions.md)

## Function Size

- Max ~20 lines per function
- Extract each distinct phase (read, parse, insert, report) into its own function
- The action function should only orchestrate: setup → phases → teardown

## Error Handling

- Guard clauses at the top of the action for invalid inputs (`log.error` + `process.exit(1)`)
- Wrap side-effectful phases in `try/catch`; propagate display errors to the action handler
- Use `@clack/prompts` for all user-facing output — no `console.log` in command code
