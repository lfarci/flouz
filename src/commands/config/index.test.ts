import { describe, expect, it } from 'bun:test'
import { formatConfigValueLine, isSupportedKey, toConfigFieldName } from '.'

describe('isSupportedKey', () => {
  it('returns true for db-path', () => {
    expect(isSupportedKey('db-path')).toBe(true)
  })

  it('returns true for github-token', () => {
    expect(isSupportedKey('github-token')).toBe(true)
  })

  it('returns true for ai-model', () => {
    expect(isSupportedKey('ai-model')).toBe(true)
  })

  it('returns true for ai-base-url', () => {
    expect(isSupportedKey('ai-base-url')).toBe(true)
  })

  it('returns false for unsupported keys', () => {
    expect(isSupportedKey('missing')).toBe(false)
  })
})

describe('toConfigFieldName', () => {
  it('maps db-path to dbPath', () => {
    expect(toConfigFieldName('db-path')).toBe('dbPath')
  })

  it('maps github-token to githubToken', () => {
    expect(toConfigFieldName('github-token')).toBe('githubToken')
  })

  it('maps ai-model to aiModel', () => {
    expect(toConfigFieldName('ai-model')).toBe('aiModel')
  })

  it('maps ai-base-url to aiBaseUrl', () => {
    expect(toConfigFieldName('ai-base-url')).toBe('aiBaseUrl')
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