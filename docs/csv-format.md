# CSV Format — Belgian Bank Export

## File Structure

Belgian bank CSV exports have two sections separated by a blank line:

1. **Metadata block** — `Key;Value` pairs describing the export parameters
2. **Data block** — a header row followed by transaction rows

```
Date de comptabilisation à partir de;01/01/2026
Date de comptabilisation jusqu'au;31/01/2026
Compte;BE00 0000 0000 0000
Nom du compte;John Doe
Adresse;...
Devise du compte;EUR
;
Compte;Date de comptabilisation;Numéro d'extrait;Numéro de transaction;Compte contrepartie;Nom contrepartie contient;Rue et numéro;Code postal et localité;Transaction;Date valeur;Montant;Devise;BIC;Code pays;Communications
BE00 0000 0000 0000;27/01/2026;001;0001;BE00 0000 0000 0000;Some Merchant;;City;PAIEMENT DEBITMASTERCARD ...;27/01/2026;-12,50;EUR;;BE;ref123
```

## Format Details

| Property | Value |
|---|---|
| Separator | `;` (semicolon) |
| Decimal separator | `,` (comma) — e.g. `-12,50` |
| Date format | `dd/MM/yyyy` |
| Encoding | Latin-1 / Windows-1252 (typical for Belgian bank exports) |

## Column Mapping

| CSV column | DB field | Transformation |
|---|---|---|
| `Compte` | `account` | Raw IBAN |
| `Date valeur` | `date` | `dd/MM/yyyy` → `yyyy-MM-dd` (fallback: `Date de comptabilisation`) |
| `Montant` | `amount` | Replace `,` with `.`, parse as float |
| `Devise` | `currency` | Usually `EUR` |
| `Nom contrepartie contient` | `counterparty` | Strip known prefixes (see below) |
| `Compte contrepartie` | `counterparty_iban` | Raw IBAN, may be empty |
| `Numéro d'extrait` + `Numéro de transaction` | `source_ref` | Concatenated as `"<extract>:<transaction>"` |
| `Communications` | `note` | Raw string |

## Counterparty Extraction

Apply in priority order:

1. **`Nom contrepartie contient`** — use if non-empty after stripping prefixes
2. **`Transaction`** — fallback, strip known prefixes
3. **`Communications`** — last resort

### Prefixes to Strip

Strip these prefixes (case-insensitive) before storing the counterparty name:

```
BANCONTACT - ACHAT -
PAIEMENT DEBITMASTERCARD
PAIEMENT DEBITMASTERCARD VIA Apple Pay
VIREMENT
DOMICILIATION
RETRAIT D'ESPECES
```

After stripping, trim leading/trailing whitespace and collapse multiple spaces.

## Parsing Notes

- The metadata block ends at the first line where the first field is empty (`;` at the start of a line)
- The header row immediately follows the blank separator line
- Rows with an empty `Montant` field should be skipped
- The `Date valeur` field is preferred over `Date de comptabilisation` because it reflects when the transaction actually settled
