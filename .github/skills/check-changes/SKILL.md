---
name: check-changes
description: Run the full quality gate on local changes — automated checks (tests, typecheck, lint) followed by a manual quality and security review of the diff. Use when asked to "check changes", "run checks", "quality gate", "pre-push check", "review my changes", or "check quality and security".
---

# Check Changes

Run all automated checks and then review the diff for quality and security issues before pushing.

## Workflow

### 1. Identify Changed Files

```bash
git diff --name-only HEAD          # uncommitted changes
git diff --name-only main...HEAD   # branch commits ahead of main
git status --porcelain
```

Use `git diff main...HEAD` when on a feature branch with commits; fall back to `git diff HEAD` when working directly on main or with only uncommitted changes.

### 2. Run Automated Checks

Run the three checks sequentially. Record pass/fail for each.

```bash
bun test
bun run typecheck
bun run lint
```

- Stop and report if any check fails — surface the exact error output so the user can act on it immediately.
- Do not attempt to fix failures automatically; report them.

### 3. Review Changed Source Files

Read each modified `src/**/*.ts` file from the diff. Do not review test files, generated files, or config.

Review against the rules below. For each finding, note the file, line, and rule violated.

#### Quality — Object Calisthenics (`src/**/*.ts`, excluding `*.test.ts`)

| Rule | Check |
|------|-------|
| One level of indentation per function | No nested `if`/`for` without extraction |
| No `else` | Use early returns / guard clauses |
| No abbreviations | `tx` → `transaction`, `cp` → `counterparty`, `cat` → `category`, `amt` → `amount` |
| Small functions | Max ~20 lines; max ~10 functions per module |
| Law of Demeter | No chained property access deeper than one level |

#### Quality — TypeScript Standards

| Rule | Check |
|------|-------|
| No `any` | Use `unknown` and narrow it |
| `@/` path aliases | No `../` relative imports to parent directories |
| No default exports | Named exports only |
| Descriptive names | No single-letter variables (except `i`/`j` loop indices) |
| Named complex return types | Inline object return types extracted to `type` aliases |

#### Quality — Architecture / SOLID

| Rule | Check |
|------|-------|
| Single responsibility | Each module does one thing |
| No direct `new Database()` in commands | Must go through `openDatabase()` |
| No inline prompt strings | Prompts live in `ai/prompts.ts` |
| No hardcoded model names | Use `getModel()` from `ai/client.ts` |
| AI results in `ai_category_id` | Never silently overwrite `category_id` |

#### Security — OWASP

| Rule | Check |
|------|-------|
| No raw SQL (A03) | All SQLite queries use `db.prepare()` with `?` placeholders |
| No hardcoded secrets (A02) | API keys and tokens must come from `Bun.env` / `process.env` |
| Input validation (A08) | External inputs (CSV fields, CLI args) validated with Zod before use |
| No verbose errors to CLI (A05) | Error messages must not expose file paths, stack traces, or internals |
| Path traversal (A01) | File paths from user input sanitized before `Bun.file()` |

#### Data Privacy

| Check |
|-------|
| No real IBANs, account numbers, or transaction amounts in test fixtures |
| No `.csv`, `.db`, or `.env` files staged for commit |
| No API keys or tokens in source code |

### 4. Report Findings

Output a structured report:

```
## Check Results

| Check      | Status |
|------------|--------|
| bun test   | ✅ PASS / ❌ FAIL |
| typecheck  | ✅ PASS / ❌ FAIL |
| lint       | ✅ PASS / ❌ FAIL |

## Quality Findings

- `src/commands/import.ts:42` — abbreviation: `tx` should be `transaction` (Object Calisthenics #3)
- `src/db/transactions/queries.ts:18` — nested `if` inside `for` loop (Object Calisthenics #1)

## Security Findings

- `src/commands/categorize.ts:31` — string interpolation in SQL query (OWASP A03)

## Summary

N quality findings, N security findings.
```

If there are no findings in a section, write "No findings."
