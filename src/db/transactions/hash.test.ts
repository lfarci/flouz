import { describe, expect, it } from 'bun:test'
import { computeTransactionHash } from './hash'

describe('computeTransactionHash', () => {
  it('returns a 64-character hex string', () => {
    const hash = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })

    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns the same hash for the same business key', () => {
    const leftHash = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    const rightHash = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })

    expect(leftHash).toBe(rightHash)
  })

  it('changes when date changes', () => {
    const leftHash = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    const rightHash = computeTransactionHash({ date: '2026-01-16', amount: -42.5, counterparty: 'ACME Shop' })

    expect(leftHash).not.toBe(rightHash)
  })

  it('changes when amount changes', () => {
    const leftHash = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    const rightHash = computeTransactionHash({ date: '2026-01-15', amount: -40.5, counterparty: 'ACME Shop' })

    expect(leftHash).not.toBe(rightHash)
  })

  it('changes when counterparty changes', () => {
    const leftHash = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'ACME Shop' })
    const rightHash = computeTransactionHash({ date: '2026-01-15', amount: -42.5, counterparty: 'Other Shop' })

    expect(leftHash).not.toBe(rightHash)
  })

  it('changes when note changes', () => {
    const leftHash = computeTransactionHash({
      date: '2026-01-15',
      amount: -42.5,
      counterparty: 'ACME Shop',
      note: 'Invoice 42',
    })
    const rightHash = computeTransactionHash({
      date: '2026-01-15',
      amount: -42.5,
      counterparty: 'ACME Shop',
      note: 'Invoice 43',
    })

    expect(leftHash).not.toBe(rightHash)
  })

  it('changes when note is present versus absent', () => {
    const leftHash = computeTransactionHash({
      date: '2026-01-15',
      amount: -42.5,
      counterparty: 'ACME Shop',
      note: 'Invoice 42',
    })
    const rightHash = computeTransactionHash({
      date: '2026-01-15',
      amount: -42.5,
      counterparty: 'ACME Shop',
    })

    expect(leftHash).not.toBe(rightHash)
  })
})