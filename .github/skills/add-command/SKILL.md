# Skill: Add a CLI Command

Activates when the user says: "add a command", "new CLI command", "scaffold command"

## Stack

- **Runtime**: Bun
- **CLI framework**: Commander.js
- **Interactive UI**: @clack/prompts

## Steps

### 1. Create `src/commands/<name>.ts`

Follow the existing command pattern:

```ts
import { Command } from "commander";

interface <Name>Options {
  // typed options here
}

export async function <name>(options: <Name>Options): Promise<void> {
  // implementation
}

export function register(program: Command): void {
  program
    .command("<name>")
    .description("...")
    .option("--some-option <value>", "description")
    .action((options) => <name>(options));
}
```

### 2. Register in `src/index.ts`

```ts
import { register as register<Name> } from "./commands/<name>.js";

register<Name>(program);
```

### 3. Write `src/commands/<name>.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import { <name> } from "./<name>.js";

describe("<name>", () => {
  it("should ...", async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

Run with `bun test`.

## Conventions

- Options are typed with a dedicated interface (not `any`)
- Export the handler as an async function for testability
- Use `@clack/prompts` for any interactive steps (spinners, confirmations, selects)
