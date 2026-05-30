# flouz

AI-powered personal finance CLI for analyzing bank transactions.

Import bank CSVs into a local SQLite database, auto-categorize transactions with AI, and track spending against monthly budgets — all from the terminal.

📖 **[Documentation](https://lfarci.github.io/flouz/)** — full guide, command reference, and configuration options.

## Quick start

```bash
git clone https://github.com/lfarci/flouz.git
cd flouz
bun install
bun link
```

Set up your GitHub token for AI features:

```bash
flouz config set github-token ghp_your_personal_access_token
```

> Get a token at [github.com/settings/tokens](https://github.com/settings/tokens) — fine-grained PAT with **Models: Read** permission, or a classic PAT (no scopes required).

Then start using flouz:

```bash
flouz transactions import transactions.csv
flouz transactions categorize --limit 20
flouz transactions suggestions review
flouz budget check
```

See the [Getting Started](https://lfarci.github.io/flouz/getting-started) guide for a full walkthrough.

## Development

```bash
bun test              # run tests
bun run typecheck     # type checking
bun run format:check  # check formatting
```

## Privacy

All data stays local in a SQLite file. Only transaction descriptions are sent to the AI provider for categorization.
