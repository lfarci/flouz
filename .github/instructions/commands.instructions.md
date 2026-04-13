---
applyTo: 'src/commands/**/*.ts'
description: 'Conventions for structuring CLI commands in the flouz project'
---

# Command Structure Conventions

## Directory Layout

Each command lives in its own subdirectory under `src/commands/`:

```
src/commands/
  import/
    index.ts        ← command factory + helper functions
    index.test.ts   ← co-located tests
  list/
    index.ts
    index.test.ts
  export/
    index.ts
    index.test.ts
```

> One directory per command — never put two commands in the same directory.

## File Responsibilities

### `index.ts`

- Exports one `create<Name>Command(): Command | Promise<Command>` factory function
- Contains a private `<name>Action(...)` function that is passed to `.action()`
- Extracts each logical phase into a named helper function (~20 lines max)
- No business logic in the factory itself — it only wires up Commander options

### `index.test.ts`

- Co-located with the command it tests
- Imports from `'.'` (the sibling `index.ts`)
- Tests helper functions and pipeline logic in isolation (no process spawning)

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
- No abbreviations in any identifier (see object-calisthenics.instructions.md)

## Function Size

- Max ~20 lines per function
- Extract each distinct phase (read, parse, insert, report) into its own function
- The action function should only orchestrate: setup → phases → teardown

## Error Handling

- Guard clauses at the top of the action for invalid inputs (`log.error` + `process.exit(1)`)
- Wrap side-effectful phases in `try/catch`; propagate display errors to the action handler
- Use `@clack/prompts` for all user-facing output — no `console.log` in command code
