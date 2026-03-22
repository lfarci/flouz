import type { Transaction } from '@/types'

export function parseDate(raw: string): string {
  // dd/MM/yyyy → yyyy-MM-dd
  const [day, month, year] = raw.trim().split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function parseAmount(raw: string): number {
  return parseFloat(raw.trim().replace(',', '.'))
}

const PREFIXES = [
  'PAIEMENT DEBITMASTERCARD VIA Apple Pay ',
  'PAIEMENT DEBITMASTERCARD ',
  'BANCONTACT - ACHAT - ',
  'VIREMENT ',
  'DOMICILIATION ',
  "RETRAIT D'ESPECES ",
]

export function cleanCounterparty(raw: string): string {
  const trimmed = raw.trim()
  for (const prefix of PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim()
    }
  }
  return trimmed
}

export function pickCounterparty(row: Record<string, string>): string {
  const primary = row['Nom contrepartie contient']?.trim()
  if (primary) return cleanCounterparty(primary)

  const fallback = row['Transaction']?.trim()
  if (fallback) return cleanCounterparty(fallback)

  const last = row['Communications']?.trim()
  return cleanCounterparty(last ?? '')
}

export function parseBankCsv(content: string, sourceFile?: string): Transaction[] {
  const lines = content.split(/\r?\n/)

  // Find the header line (starts with 'Compte;')
  const headerIdx = lines.findIndex(l => l.startsWith('Compte;'))
  if (headerIdx === -1) throw new Error('Could not find header row in bank CSV')

  const headers = lines[headerIdx].split(';')

  const transactions: Transaction[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = lines[i].split(';')
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cols[j] ?? ''
    }

    const rawDate = row['Date valeur']?.trim() || row['Date de comptabilisation']?.trim()
    if (!rawDate) continue

    const extract = row["Numéro d'extrait"]?.trim()
    const txNum = row['Numéro de transaction']?.trim()
    const sourceRef = extract || txNum ? `${extract}:${txNum}` : undefined

    transactions.push({
      date: parseDate(rawDate),
      amount: parseAmount(row['Montant']),
      counterparty: pickCounterparty(row),
      counterpartyIban: row['Compte contrepartie']?.trim() || undefined,
      currency: row['Devise']?.trim() || 'EUR',
      account: row['Compte']?.trim() || undefined,
      sourceRef,
      note: row['Communications']?.trim() || undefined,
      sourceFile,
      importedAt: new Date().toISOString(),
    })
  }

  return transactions
}
