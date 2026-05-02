# flouz accounts

Registers named bank accounts so imported transactions can be associated with a specific account. Accounts are optional — transactions can be imported without one.

## Use cases

- **Multiple bank accounts** — tag imported transactions with the account they belong to so you can filter or group by account later
- **Named imports** — assign a human-readable name and company to the short key used in CSV exports
- **Preventing accidental deletion** — flouz blocks deleting an account that still has linked transactions

## Usage

```sh
# Register a new account
flouz accounts add checking "Main Checking" "My Bank"
flouz accounts add savings "Savings Account" "My Bank" --iban "BE00 0000 0000 0000"
flouz accounts add joint "Joint Account" "My Bank" --description "Shared household expenses"

# List all registered accounts
flouz accounts list

# Delete an account (only works if no transactions reference it)
flouz accounts delete checking
```

## Reference

### `flouz accounts add <key> <name> <company>`

| Argument / Option | Required | Description |
|---|---|---|
| `<key>` | yes | Unique import key — must match the key column in CSV exports |
| `<name>` | yes | Human-readable account label |
| `<company>` | yes | Bank or institution name |
| `-d, --description <text>` | no | Optional free-text description |
| `-i, --iban <iban>` | no | Optional IBAN for reference |
| `--db <path>` | no | Override database path |

### `flouz accounts list`

| Option | Description |
|---|---|
| `--db <path>` | Override database path |

### `flouz accounts delete <key>`

| Argument / Option | Description |
|---|---|
| `<key>` | Unique import key of the account to delete |
| `--db <path>` | Override database path |

An account with associated transactions cannot be deleted.
