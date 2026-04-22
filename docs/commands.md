# flouz Command Reference

```
flouz — AI-powered personal finance CLI for bank transactions
├── config — Manage flouz configuration
│   ├── set <key> <value> — Set a config value
│   └── get [key] — Get config value(s)
│       Keys: db-path, github-token, ai-model, ai-base-url
│
├── accounts — Manage configured accounts
│   ├── add <key> <name> <company> — Add a configured account
│   │   Options: -d/--description <text>, -i/--iban <iban>, --db <path>
│   ├── list — List configured accounts
│   │   Options: --db <path>
│   └── delete <key> — Delete a configured account by key
│       Options: --db <path>
│
└── transactions — Manage stored transactions
    ├── import <path> — Import transactions from a CSV file or directory
    │   Options: -d/--db <path>
    ├── list — List transactions
    │   Options: -f/--from <date>, -t/--to <date>, -c/--category <slug>,
    │            -s/--search <text>, -l/--limit <n>, --uncategorized,
    │            -o/--output <format>, -d/--db <path>
    ├── categorize — AI-categorize uncategorized transactions
    │   Options: -f/--from <date>, -t/--to <date>, -s/--search <text>,
    │            -l/--limit <n>, -d/--db <path>
    ├── categories — Manage transaction categories
    │   └── list — List available transaction categories
    │       Options: --tree, -d/--db <path>
    └── suggestions — Review and apply AI-generated category suggestions
        ├── list — List transaction category suggestions
        │   Options: -f/--from <date>, -t/--to <date>, -s/--search <text>,
        │            -l/--limit <n>, --status <status>, -d/--db <path>
        ├── review — Interactively review pending suggestions one by one
        │   Options: -f/--from <date>, -t/--to <date>, -s/--search <text>,
        │            -l/--limit <n>, -d/--db <path>
        ├── approve — Approve pending suggestions
        │   Options: -f/--from <date>, -t/--to <date>, -s/--search <text>,
        │            -l/--limit <n>, -d/--db <path>
        ├── apply — Apply approved suggestions to transactions
        │   Options: -f/--from <date>, -t/--to <date>, -s/--search <text>,
        │            -l/--limit <n>, -d/--db <path>
        ├── reject — Reject pending or approved suggestions
        │   Options: -f/--from <date>, -t/--to <date>, -s/--search <text>,
        │            -l/--limit <n>, --status <status>, -d/--db <path>
        └── fix — Override the suggested category for a transaction
            Options: --id <transactionId>, --category <slug>, -d/--db <path>
```
