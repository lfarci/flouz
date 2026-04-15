---
description: 'TypeScript coding standards for the flouz project'
applyTo: '**/*.ts'
---

# TypeScript Standards

## Strictness

- `strict: true` is enabled — never use `any`; `unknown` must be narrowed before use
- Prefer `type` over `interface` for data shapes; use `interface` only for extensible contracts
- Avoid `enum` — use `const` objects with `as const` instead

## Imports

- **Always use `@/` path aliases — never relative parent paths (`../`)**
  - ✅ `import { initDb } from '@/db/schema'`
  - ❌ `import { initDb } from '../db/schema'`
- The alias `@/*` maps to `src/*` — configured in `tsconfig.json`
- Same-directory imports (e.g. `'./bank'`) are fine

## Exports

- No default exports — named exports only
- No barrel `index.ts` re-exports unless the directory has 4+ modules

## Style

- Prefer early returns over nested conditionals
- Max function length: ~40 lines — extract helpers freely
- Comment only non-obvious logic — no JSDoc on trivial getters/setters
- **No single-letter or abbreviated variable names** — use descriptive full names in all contexts, except for well-established mathematical conventions (`i`, `j` for loop indices):
  - ✅ `fileSpinner`, `insertProgress`, `parseError`
  - ❌ `s`, `p`, `e`
- **Extract complex return types** to named `type` aliases for re-usability and readability:
  - ✅ `type InsertResult = { totalImported: number; allErrors: ParseError[] }`
  - ❌ `Promise<{ totalImported: number; allErrors: ParseError[] }>`

## SIGINT / Resource Lifecycle

- Register `process.once('SIGINT', onCancel)` at the top of any long-running action
- Always call `process.removeListener('SIGINT', onCancel)` before returning (success or error)
- Close database handles before `process.exit()`
- Use `let database: Database | undefined` so the cancel handler can safely call `database?.close()`

## Bun-specific

- File I/O: prefer `Bun.file()` and `Bun.write()` over `fs` equivalents
- Environment: prefer `Bun.env.VAR` over `process.env.VAR`
- SQLite: use `bun:sqlite` directly — `new Database(path)`, prepared statements via `db.prepare()`
