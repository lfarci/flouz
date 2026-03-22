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

## Bun-specific
- File I/O: prefer `Bun.file()` and `Bun.write()` over `fs` equivalents
- Environment: prefer `Bun.env.VAR` over `process.env.VAR`
- SQLite: use `bun:sqlite` directly — `new Database(path)`, prepared statements via `db.prepare()`
