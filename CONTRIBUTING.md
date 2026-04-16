# Contributing

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- A GitHub token with GitHub Models access (for AI features)

## Setup

```bash
git clone https://github.com/lfarci/flouz.git
cd flouz
bun install
```

## Development workflow

```bash
bun run dev          # watch mode
bun test             # run tests
bun run typecheck    # type check
bun run lint         # lint
bun run format       # format
```

## Code standards

- **TypeScript strict mode** — no `any`, no relative parent imports (`../`), use `@/` aliases
- **No `console.log`** — use `@clack/prompts` for all user-facing output
- **Bun APIs only** — `Bun.file()`, `bun:sqlite`, `Bun.env`; never Node.js equivalents
- **Prepared statements only** — no raw SQL string interpolation
- **Tests required** — every new feature or bug fix needs a test in `bun test`

See `.github/instructions/` for detailed rules on TypeScript, testing, database conventions, and command structure.

## Submitting changes

1. Fork the repo and create a branch from `main`
2. Make your changes and ensure `bun test`, `bun run typecheck`, and `bun run lint` all pass
3. Open a pull request — describe what you changed and why

## Data privacy

Never commit real transaction data, real IBANs, or API keys. Test fixtures must use invented data only. See `.github/instructions/data-privacy.instructions.md`.
