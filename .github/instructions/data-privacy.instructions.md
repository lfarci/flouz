---
applyTo: "**"
---

# Data Privacy — Never Commit Personal or Bank Data

## Absolute rules

- **Never commit real transaction data** — no CSV files, no JSON dumps, no database files (`.db`, `.sqlite`)
- **Never commit real IBANs** — not in code, comments, tests, fixtures, or documentation
- **Never commit bank account names, BIC codes, or counterparty names** from real transactions
- **Never commit API keys, tokens, or credentials** — use `.env` (gitignored) for all secrets
- **Never hardcode `GITHUB_TOKEN` or any AI provider key** in source files

## Test fixtures

- All fixture files in `src/parsers/__fixtures__/` must use **fake, invented data only**
- Use placeholder IBANs like `BE00 0000 0000 0000`
- Use invented merchant names like `ACME Shop`, `Test Merchant`, `Fake Telecom`
- Use invented amounts — never copy real transaction amounts

## .gitignore rules (already configured)

The following are gitignored and must stay that way:
- `*.csv` — never force-add CSV files
- `*.db`, `*.sqlite` — never force-add database files
- `.env` — never commit environment files

## When in doubt

If you are unsure whether a value is personal data, treat it as personal data and do not commit it.
