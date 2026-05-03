---
name: import-transactions
description: Debug and extend the bank CSV import pipeline — diagnose parse failures, add fixture files, and write targeted tests. Use when the user says "import CSV", "debug import", "parse transactions", or "import transactions".
allowed-tools: Bash
---

# Skill: Import Transactions

Activates when the user says: "import CSV", "debug import", "parse transactions", "import transactions"

## Running the import

```bash
bun run src/index.ts import <file.csv>
```

## Common bank CSV issues

| Issue                      | Details                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Metadata block not skipped | Bank CSV exports include several header lines before the actual data; the parser must skip them |
| Semicolon separator        | The format uses `;` not `,` as the column delimiter                                             |
| Comma decimals             | Amounts use `,` as the decimal separator (e.g. `1 234,56`) — must be normalized to `.`          |
| French headers             | Column names are in French (e.g. `Date`, `Libellé`, `Montant`)                                  |

## Adding a fixture and a targeted test

1. Add the fixture CSV to `src/parsers/__fixtures__/<name>.csv`
2. Write a test in `src/parsers/<name>.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { parse } from "./<parser>.js";
import { readFileSync } from "fs";
import { join } from "path";

describe("parse", () => {
  it("should parse bank CSV fixture", () => {
    const csv = readFileSync(
      join(import.meta.dir, "__fixtures__/<name>.csv"),
      "utf-8"
    );

    const transactions = parse(csv);

    expect(transactions).toHaveLength(<expected>);
    expect(transactions[0]).toMatchObject({
      date: "YYYY-MM-DD",
      label: "...",
      amount: ...,
    });
  });
});
```

## Duplicate detection

Check the `source_ref` field — it is used as a unique key to prevent re-importing the same transaction. If imports are silently skipped, verify that `source_ref` is stable across re-runs.
