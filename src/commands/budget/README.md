# `flouz budget` — Monthly Budget Management

Manage monthly budgets and track spending against them.

## Subcommands

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `budget set`        | Set or update a monthly budget for a category       |
| `budget list`       | List budgets for a given month                      |
| `budget check`      | Dashboard showing budget progress and pace          |
| `budget total set`  | Set the monthly income total for percentage budgets |
| `budget total show` | Show the stored or detected monthly income total    |

## Category Constraints

Budgets can **only** be set on top-level categories (those with `parentId: null`):

- `necessities` — House, Utilities, Groceries, Transport, Health, Insurance, Fees & Taxes, Cash & ATM
- `savings` — Savings Account, Investments
- `discretionary` — Food & Drink, Shopping, Entertainment, Travel, Gifts & Charity, Online Services
- `income` — Salary, Reimbursement, Gifts Received, Other Income

When checking budget progress, spending is aggregated across all descendant categories under each top-level parent.

## Budget Types

- **Fixed** — a EUR amount (e.g. `2000`)
- **Percentage** — a percentage of monthly income (e.g. `60%`)

Percentage budgets resolve against the monthly income total. The resolution priority is:

1. Manually stored monthly income for the month (`budget total set`)
2. Auto-detected income from categorized transactions for the month
3. Stored monthly income from the previous month
4. Auto-detected income from the previous month

## Examples

```bash
# Set fixed budgets
flouz budget set necessities 2000
flouz budget set discretionary 800

# Set percentage-based budgets
flouz budget set necessities 60%
flouz budget set savings 20%

# Set monthly income total
flouz budget total set 3500
flouz budget total set              # interactive with auto-detect

# Show monthly income
flouz budget total show

# List configured budgets
flouz budget list

# Check progress dashboard
flouz budget check

# Target a specific month
flouz budget set necessities 2200 --month 2026-06
flouz budget check --month 2026-06
```
