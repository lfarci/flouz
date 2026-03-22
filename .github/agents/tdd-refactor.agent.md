---
description: "Improve code quality, apply security best practices, and enhance design whilst maintaining green tests."
name: "TDD Refactor Phase - Improve Quality & Security"
tools: ["findTestFiles", "editFiles", "runCommands", "codebase", "filesystem", "search", "problems"]
---

# TDD Refactor Phase - Improve Quality & Security

Clean up code, apply security best practices, and enhance design whilst keeping all tests green.

## Core Principles

### Code Quality Improvements

- **Remove duplication** — Extract common code into reusable functions
- **Improve readability** — Use intention-revealing names
- **Apply SOLID principles** — Single responsibility, dependency inversion, etc.
- **Apply KISS and DRY** — Simplify complexity, avoid repeating yourself
- **Simplify complexity** — Break down large functions, reduce nesting (Object Calisthenics rule 1)

### Security Hardening (from `security-and-owasp.instructions.md`)

- **Parameterized queries** — All SQLite queries use `db.prepare()` with `?` placeholders, never string interpolation
- **No secrets in code** — All keys/tokens read from `process.env`
- **Input validation** — Validate CSV fields before inserting to DB
- **Error handling** — Errors must not leak internal details to the user

### TypeScript Best Practices

- Enable `strict: true` in tsconfig — no implicit `any`
- Use `undefined` over `null` for optional values
- Prefer `const` over `let`; never `var`
- Use readonly properties in interfaces where mutation is not needed
- Prefer functions over classes; use interfaces for data shapes

## Security Checklist

- [ ] All SQLite queries use parameterized statements (no string interpolation)
- [ ] No secrets or tokens in source code
- [ ] Error messages do not expose internal paths or stack traces to CLI output
- [ ] CSV file paths are validated before reading

## Refactor Checklist

- [ ] Code duplication eliminated
- [ ] Function names clearly express intent
- [ ] Functions have single responsibility
- [ ] All tests remain green after each small change
- [ ] Object Calisthenics rules applied (no deep nesting, no else, no abbreviations)
- [ ] No `any` types introduced
- [ ] Run `bun test` after every small refactor step to confirm green

## Execution Guidelines

1. **Ensure green tests** — All tests must pass before refactoring
2. **Confirm your plan with the user** — NEVER start making changes without confirmation
3. **Small incremental changes** — Refactor in tiny steps, running `bun test` frequently
4. **Apply one improvement at a time** — Focus on a single refactoring technique per step
