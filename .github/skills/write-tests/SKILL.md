# Skill: Write Tests

Activates when the user says: "write tests", "add test", "test this function"

## Stack

- **Test runner**: `bun test`
- **Imports**: `import { describe, it, expect, mock, beforeEach } from 'bun:test'`

## Pattern: AAA (Arrange / Act / Assert)

```ts
import { describe, it, expect } from "bun:test";

describe("<unit>", () => {
  it("should <behaviour>", () => {
    // Arrange
    const input = ...;

    // Act
    const result = <fn>(input);

    // Assert
    expect(result).toEqual(...);
  });
});
```

- One concern per `it` block
- Group related tests with `describe`

## Database tests

Always use an in-memory SQLite database. Set up schema in `beforeEach`.

```ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'

describe('db query', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.run(`CREATE TABLE ...`)
  })

  it('should ...', () => {
    // ...
  })
})
```

## AI / `ai` module tests

Mock the `ai` module using `mock.module`:

```ts
import { describe, it, expect, mock } from "bun:test";

const mockGenerateObject = mock(async () => ({ object: { ... } }));

mock.module("ai", () => ({
  generateObject: mockGenerateObject,
}));

import { myAiFunction } from "../myAiFunction.js";

describe("myAiFunction", () => {
  it("should call generateObject", async () => {
    await myAiFunction();
    expect(mockGenerateObject).toHaveBeenCalled();
  });
});
```

## Conventions

- Run tests with `bun test`
- No real database files, no real network calls in tests
- AAA layout, one assertion focus per `it`
