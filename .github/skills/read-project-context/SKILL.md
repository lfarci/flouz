# Skill: Read Project Context

## Activation

Use this skill when the user says any of the following:
- "understand the project"
- "read the docs"
- "project context"
- "what is this project"
- "get up to speed"
- "read context"

---

## Instructions

**Never start coding before reading context first.**

### Step 1 — Read the documentation in order

Read each of the following files before doing anything else:

1. `.github/copilot-instructions.md` — stack, principles, domain rules
2. `docs/architecture.md` — project structure and design decisions
3. `docs/database.md` — SQLite schema and category hierarchy
4. `docs/csv-format.md` — bank CSV format and column mappings
5. `docs/ai-providers.md` — AI provider switching and configuration

### Step 2 — Inspect existing implementation

After reading the docs, scan the `src/` directory to understand what has already been implemented:

```bash
find src/ -type f | sort
```

### Step 3 — Check open issues

Retrieve the list of open GitHub Issues to understand pending work:

```bash
gh issue list --repo lfarci/flouz
```

### Step 4 — Summarize

Provide a concise summary covering:
- **Stack**: languages, runtimes, frameworks, and tools in use
- **Current phase**: what stage of development the project is in
- **Already implemented**: modules or features that exist in `src/`
- **Pending work**: open issues that haven't been addressed yet
