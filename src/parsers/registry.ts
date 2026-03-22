import { parseBankCsv } from './bank'
import type { Transaction } from '../types'

export type ParserFormat = 'bank'

export function parse(content: string, format: ParserFormat, sourceFile?: string): Transaction[] {
  switch (format) {
    case 'bank': return parseBankCsv(content, sourceFile)
    default: throw new Error(`Unknown parser format: ${format}`)
  }
}

export function detectFormat(_content: string): ParserFormat {
  // Future: auto-detect. For now always return 'bank'
  return 'bank'
}
