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

## Naming Rules

- Command factories: `createImportCommand`, `createListCommand`, etc.
- Action handlers: `importAction`, `listAction`, etc. (private, not exported)
- Phase helpers: descriptive verb phrases — `parseAllFiles`, `insertAllTransactions`, `reportResults`
- No abbreviations in any identifier (see object-calisthenics.instructions.md)

## Function Size

- Max ~20 lines per function
- Extract each distinct phase (read, parse, insert, report) into its own function
- The action function should only orchestrate: setup → phases → teardown

## SIGINT / Resource Lifecycle

- Register `process.once('SIGINT', onCancel)` at the top of the action function
- Always call `process.removeListener('SIGINT', onCancel)` before returning (success or error)
- Close the database before `process.exit()`
- Use `let db: Database | undefined` so the cancel handler can safely call `db?.close()`

## Error Handling

- Guard clauses at the top of the action for invalid inputs (`log.error` + `process.exit(1)`)
- Wrap side-effectful phases in `try/catch`; propagate display errors to the action handler
- Use `@clack/prompts` for all user-facing output — no `console.log` in command code
