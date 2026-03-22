---
name: git-commit
description: 'Execute git commit with conventional commit message analysis, intelligent staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit". Supports: (1) Auto-detecting type and scope from changes, (2) Generating conventional commit messages from diff, (3) Interactive commit with optional type/scope/description overrides, (4) Intelligent file staging for logical grouping'
license: MIT
allowed-tools: Bash
---

# Git Commit with Conventional Commits

## Overview

Create standardized, semantic git commits using the Conventional Commits specification. Analyze the actual diff to determine appropriate type, scope, and message.

## Conventional Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types

| Type       | Purpose                        |
| ---------- | ------------------------------ |
| `feat`     | New feature                    |
| `fix`      | Bug fix or patch               |
| `docs`     | Documentation only             |
| `style`    | Formatting/style (no logic)    |
| `refactor` | Code refactor (no feature/fix) |
| `perf`     | Performance improvement        |
| `test`     | Add/update tests               |
| `build`    | Build system/dependencies      |
| `ci`       | CI/config changes              |
| `chore`    | Maintenance/misc               |
| `revert`   | Revert commit                  |

## Type Selection Guide

**`feat` — new user-facing capability only**

Reserve `feat` for changes that introduce something users couldn't do before:
- A new CLI command (`import`, `categorize`)
- A new flag or option that unlocks new behavior
- A new database table or API integration

**`fix` — any correction or small improvement**

Use `fix` for everything that corrects, adjusts, or polishes existing behavior:
- Fixing a bug or crash
- Adjusting wording, labels, or formatting in CLI output
- Tweaking spacing, alignment, colors, or spinner text in prompts
- Correcting an error message, help text, or log line
- Small UX improvements that don't add new capability

> **Rule of thumb:** If a user could already do the thing and you're making it work better or look better, use `fix`. Only use `feat` when you're unlocking something new.

**Examples**

| Change | Type |
| ------ | ---- |
| Add `--dry-run` flag to import command | `feat` |
| Change "Importing…" spinner to "Reading file…" | `fix` |
| Fix crash when CSV has no rows | `fix` |
| Rename `categorize` output columns | `fix` |
| Add `chat` command | `feat` |
| Improve error message for missing file | `fix` |
| Reword help text on `--format` flag | `fix` |
| Add AI-based category suggestion | `feat` |

## Scope Examples for finance-cli

- `import` — CSV parsing and import command
- `db` — SQLite schema or query changes
- `categorize` — AI categorization command
- `parser` — bank CSV parser
- `mcp` — MCP server
- `ci` — GitHub Actions workflow

## Workflow

### 1. Analyze Diff

```bash
git diff --staged   # if files are staged
git diff            # if nothing staged
git status --porcelain
```

### 2. Stage Files (if needed)

```bash
git add src/commands/import.ts src/parsers/source.ts
```

**Never commit secrets** (.env, credentials).

### 3. Execute Commit

```bash
git commit -m "feat(import): add bank CSV parser with metadata skip

Parse semicolon-delimited bank export files, skip metadata block,
normalize dates to yyyy-MM-dd and amounts to dot-decimal.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Best Practices

- One logical change per commit
- Present tense: "add" not "added"
- Imperative mood: "fix bug" not "fixes bug"
- Keep description under 72 characters
- Always include Co-authored-by trailer when Copilot helped

## Git Safety Protocol

- NEVER update git config
- NEVER run destructive commands (--force, hard reset) without explicit request
- NEVER skip hooks (--no-verify) unless user explicitly asks
- NEVER force push to main/master
