import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'

// Must import after setting XDG_CONFIG_HOME so the module picks up the right path.
// Re-import per test group by manipulating env before dynamic import.

const TMP = join(tmpdir(), `flouz-config-test-${Date.now()}`)

async function freshModule() {
  // Dynamic import with cache-busting so each test group gets a clean module
  // with the current XDG_CONFIG_HOME value.
  return import(`@/config?t=${Date.now()}`) as Promise<typeof import('@/config')>
}

describe('readConfig', () => {
  beforeEach(() => {
    process.env.XDG_CONFIG_HOME = TMP
  })

  afterEach(async () => {
    delete process.env.XDG_CONFIG_HOME
    await rm(TMP, { recursive: true, force: true })
  })

  it('returns empty object when config file does not exist', async () => {
    const { readConfig } = await freshModule()
    const config = await readConfig()
    expect(config).toEqual({})
  })

  it('returns parsed config when file exists', async () => {
    const { writeConfig, readConfig } = await freshModule()
    await writeConfig({ dbPath: '/tmp/test.db' })
    const config = await readConfig()
    expect(config.dbPath).toBe('/tmp/test.db')
  })

  it('returns empty object when config file contains invalid JSON', async () => {
    const { readConfig } = await freshModule()
    const { mkdir } = await import('node:fs/promises')
    await mkdir(`${TMP}/flouz`, { recursive: true })
    await Bun.write(`${TMP}/flouz/config.json`, 'not valid json {{{')
    const config = await readConfig()
    expect(config).toEqual({})
  })

  it('returns empty object when config file has unexpected shape', async () => {
    const { readConfig } = await freshModule()
    const { mkdir } = await import('node:fs/promises')
    await mkdir(`${TMP}/flouz`, { recursive: true })
    await Bun.write(`${TMP}/flouz/config.json`, JSON.stringify({ unknown: 123 }))
    const config = await readConfig()
    expect(config).toEqual({})
  })
})

describe('writeConfig', () => {
  beforeEach(() => {
    process.env.XDG_CONFIG_HOME = TMP
  })

  afterEach(async () => {
    delete process.env.XDG_CONFIG_HOME
    await rm(TMP, { recursive: true, force: true })
  })

  it('creates the config directory and file when they do not exist', async () => {
    const { writeConfig } = await freshModule()
    await writeConfig({ dbPath: '/tmp/finances.db' })
    const file = Bun.file(`${TMP}/flouz/config.json`)
    expect(await file.exists()).toBe(true)
  })

  it('merges updates with existing config', async () => {
    const { writeConfig, readConfig } = await freshModule()
    await writeConfig({ dbPath: '/tmp/first.db' })
    await writeConfig({ dbPath: '/tmp/second.db' })
    const config = await readConfig()
    expect(config.dbPath).toBe('/tmp/second.db')
  })
})

describe('resolveDbPath', () => {
  const originalDbPath = process.env.DB_PATH

  beforeEach(() => {
    process.env.XDG_CONFIG_HOME = TMP
    delete process.env.DB_PATH
  })

  afterEach(async () => {
    delete process.env.XDG_CONFIG_HOME
    if (originalDbPath !== undefined) process.env.DB_PATH = originalDbPath
    else delete process.env.DB_PATH
    await rm(TMP, { recursive: true, force: true })
  })

  it('returns ~/.config/flouz/flouz.db when no env var and no config', async () => {
    const { resolveDbPath } = await freshModule()
    const path = await resolveDbPath()
    expect(path).toBe(`${TMP}/flouz/flouz.db`)
  })

  it('returns DB_PATH env var when set, ignoring config', async () => {
    const { writeConfig, resolveDbPath } = await freshModule()
    await writeConfig({ dbPath: '/tmp/from-config.db' })
    process.env.DB_PATH = '/tmp/from-env.db'
    const path = await resolveDbPath()
    expect(path).toBe('/tmp/from-env.db')
  })

  it('returns config file dbPath when DB_PATH env is not set', async () => {
    const { writeConfig, resolveDbPath } = await freshModule()
    await writeConfig({ dbPath: '/tmp/from-config.db' })
    const path = await resolveDbPath()
    expect(path).toBe('/tmp/from-config.db')
  })
})
