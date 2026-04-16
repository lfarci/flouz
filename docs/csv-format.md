# CSV Format

flouz imports a generic comma-separated CSV format.

## Required Shape

The file must contain a header row and zero or more transaction rows.

```csv
date,amount,counterparty,counterparty_iban,currency,account,note
2026-01-15,-42.50,ACME Shop,BE00 0000 0000 0000,EUR,checking,Invoice 42
2026-01-16,1200.00,Employer,,EUR,,January salary
```

## Format Details

| Property          | Value        |
| ----------------- | ------------ |
| Separator         | `,` (comma)  |
| Decimal separator | `.` (dot)    |
| Date format       | `yyyy-MM-dd` |
| Header row        | Required     |

## Columns

| CSV column          | Required | Meaning                                     |
| ------------------- | -------- | ------------------------------------------- |
| `date`              | Yes      | Transaction date in `yyyy-MM-dd` format     |
| `amount`            | Yes      | Signed decimal amount                       |
| `counterparty`      | Yes      | Merchant, sender, or other party name       |
| `counterparty_iban` | No       | IBAN of the other party                     |
| `currency`          | No       | Currency code, defaults to `EUR` when empty |
| `account`           | No       | Configured account key                      |
| `note`              | No       | Free-text note                              |

## Account Column

The `account` column is a machine lookup key, not a display label.
If it is present, it must match an account created ahead of time with `flouz accounts add`.

## Parsing Notes

- Empty files return no transactions.
- Header-only files return no transactions.
- Blank lines are ignored.
- If `counterparty` is empty and `note` is present, `note` is used as the counterparty fallback.
- If both `counterparty` and `note` are empty, the row is rejected.
