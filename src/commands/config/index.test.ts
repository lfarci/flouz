import { describe, expect, it } from 'bun:test'
import { formatConfigValueLine, isSupportedKey, toConfigFieldName } from '.'

describe('isSupportedKey', () => {
  it('returns true for supported keys', () => {
    expect(isSupportedKey('db-path')).toBe(true)
  })

  it('returns false for unsupported keys', () => {
    expect(isSupportedKey('missing')).toBe(false)
  })
})

describe('toConfigFieldName', () => {
  it('maps db-path to dbPath', () => {
    expect(toConfigFieldName('db-path')).toBe('dbPath')
  })
})

describe('formatConfigValueLine', () => {
  it('formats configured values', () => {
    expect(formatConfigValueLine('db-path', '/tmp/flouz.db')).toBe('db-path = /tmp/flouz.db')
  })

  it('formats missing values', () => {
    expect(formatConfigValueLine('db-path', undefined)).toBe('db-path = (not set)')
  })
})