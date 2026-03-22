# Skill: Add a Database Query

Activates when the user says: "add a query", "new query helper", "bun:sqlite query"

## Stack

- **Runtime**: Bun
- **Database**: `bun:sqlite` (no ORM, no Drizzle, no Prisma)

## Steps

### 1. Add a typed query helper to `src/db/queries.ts`

Use prepared statements. **Never** interpolate user input into SQL strings — this is a SQL injection risk.

```ts
import { Database } from "bun:sqlite";

export function create<Entity>Query(db: Database) {
  const stmt = db.prepare<Entity, [/* param types */]>(
    `SELECT * FROM <table> WHERE <column> = ?`
  );

  return {
    findBy<Field>(value: <Type>): <Entity> | null {
      return stmt.get(value) ?? null;
    },
  };
}
```

### 2. Write `src/db/queries.test.ts`

Always use an in-memory database for tests. Run schema setup in `beforeEach`.

```ts
import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { create<Entity>Query } from "./queries.js";

describe("create<Entity>Query", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.run(`CREATE TABLE <table> (...)`);
  });

  it("should return null when not found", () => {
    const query = create<Entity>Query(db);
    expect(query.findBy<Field>("nonexistent")).toBeNull();
  });
});
```

## Conventions

- Parameterized queries only — never string interpolation
- Prepared statements are created once and reused
- Tests always use `new Database(':memory:')` — never the real database file
