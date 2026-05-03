# `flouz budget` — Monthly Budget Management

Manage monthly budgets and track spending against them.

## Subcommands

| Command             | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `budget set`        | Set or update a monthly budget — interactive or direct |
| `budget list`       | List budgets for a given month                         |
| `budget check`      | Dashboard showing budget progress and pace             |
| `budget total set`  | Set the monthly income total for percentage budgets    |
| `budget total show` | Show the stored or detected monthly income total       |

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

## `budget set` modes

### Interactive

Omit either argument to be prompted:

```bash
flouz budget set             # prompts for category (select) then amount (text)
flouz budget set necessities # prompts for amount only
```

The category prompt shows all top-level non-income categories as a select list.

### Direct

Pass both arguments to skip prompts — useful for scripting:

```bash
flouz budget set necessities 2000
flouz budget set discretionary 800
flouz budget set savings 20%
```

### Default allocation

Apply a preset allocation across necessities, discretionary, and savings in one command:

```bash
flouz budget set --defaults                          # 30% necessities, 30% discretionary, 20% savings
flouz budget set --defaults --necessities 40% --discretionary 25% --savings 15%
flouz budget set --defaults --month 2026-06          # target a specific month
```

The per-category options (`--necessities`, `--discretionary`, `--savings`) accept the same format as `<amount>`: a EUR amount or a percentage of income. They default to `30%`, `30%`, `20%` respectively.

## Examples

```bash
# Interactive — select category, then enter amount
flouz budget set

# Direct — fixed and percentage budgets
flouz budget set necessities 2000
flouz budget set savings 20%

# Default allocation in one shot
flouz budget set --defaults
flouz budget set --defaults --necessities 40% --discretionary 25% --savings 15%

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
