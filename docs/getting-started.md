# Getting Started

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- A GitHub account with access to [GitHub Models](https://github.com/marketplace/models) (free with a Copilot subscription)

## Installation

```bash
git clone https://github.com/lfarci/flouz.git
cd flouz
bun install
bun link              # registers `flouz` as a global command
```

After `bun link`, configure your GitHub token so AI features work:

```bash
flouz config set github-token ghp_your_personal_access_token
```

Get a token at [github.com/settings/tokens](https://github.com/settings/tokens):

- **Fine-grained PAT** — enable the **Models: Read** permission (under "Account permissions")
- **Classic PAT** — no scopes required

## Verify the installation

```bash
flouz --help
```

## Your first import

### 1. Create an account

```bash
flouz accounts add checking "Main account" Belfius --iban "BE00 0000 0000 0000"
```

### 2. Prepare a CSV file

Create a file `transactions.csv` with the [expected format](./csv-format):

```csv
date,amount,counterparty,counterparty_iban,currency,account,note
2026-01-15,-42.50,ACME Shop,BE00 0000 0000 0000,EUR,checking,Invoice 42
2026-01-16,1200.00,Employer,,EUR,,January salary
```

### 3. Import transactions

```bash
flouz transactions import transactions.csv
```

### 4. View your transactions

```bash
flouz transactions list
```

### 5. AI categorization

```bash
# Generate suggestions
flouz transactions categorize --limit 20

# Review suggestions interactively
flouz transactions suggestions review

# Apply approved suggestions
flouz transactions suggestions apply
```

### 6. Set a budget

```bash
flouz budget total set 3500
flouz budget set necessities 50%
flouz budget set discretionary 30%
flouz budget set savings 20%
flouz budget check
```

## Updating

```bash
cd flouz
git pull
bun install  # sync dependencies if changed
```

No need to re-run `bun link` after updates.

## What's next?

- [Command Reference](./commands/transactions) — full list of commands and options
- [Configuration](./configuration) — database path, AI model, environment variables
- [AI Providers](./ai-providers) — switch between GitHub Models, Anthropic, or Ollama
