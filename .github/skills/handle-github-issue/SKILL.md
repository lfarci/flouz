# Skill: Handle GitHub Issue

## Activation

Use this skill when the user says any of the following:
- "work on issue"
- "implement issue"
- "pick up issue"
- "handle issue #"
- "start issue"
- "take issue"

---

## Instructions

### Step 1 — Understand the issue

Read the issue in full:

```bash
gh issue view <number> --repo lfarci/flouz
```

- Check the issue body for dependency references (e.g. "Depends on: #N"). If any are listed, verify they are closed before proceeding.
- Read relevant project documentation using the `read-project-context` skill before writing any code.

### Step 2 — Create a branch

Never commit directly to `main`. Always work on a dedicated branch:

```bash
git checkout -b feat/issue-<number>-<short-description>
```

Use a short, lowercase, hyphen-separated description derived from the issue title.

### Step 3 — Implement with TDD

Follow a strict red → green → refactor cycle:

1. **Red** — write a failing test that captures the expected behaviour:
   ```bash
   bun test
   ```
2. **Green** — write the minimal code needed to make the test pass:
   ```bash
   bun test
   ```
3. **Refactor** — clean up the code while keeping all tests green. Apply these principles:
   - SOLID: single responsibility, open/closed, dependency inversion
   - DRY: no duplicated logic
   - No `else` branches — use early returns instead
   - Small, focused functions

All tests must pass before opening a PR.

### Step 4 — Verify

Run both checks and ensure they pass with no errors:

```bash
bun run typecheck
bun test
```

### Step 5 — Commit and open a PR

Use this commit message format:

```
feat: <description> (closes #<number>)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

Push the branch and open a pull request:

```bash
gh pr create --repo lfarci/flouz --title "feat: <description>" --body "Closes #<number>" --base main
```

---

## Reminders

- **No real data in tests** — never use real IBANs, account numbers, or real transaction data. Use fixtures with fake, clearly synthetic values.
- **In-memory DB for tests** — always use `new Database(':memory:')` when testing database logic.
- **Mock AI calls** — never invoke a real LLM in tests. Use `mock.module('ai', ...)` to mock AI provider calls.
- **No secrets in code** — never commit API keys, tokens, or credentials.
