import { describe, it, expect } from 'bun:test'
import { version } from '../package.json'

describe('flouz CLI', () => {
  it('outputs the version from package.json when --version is passed', async () => {
    const proc = Bun.spawn([process.execPath, 'src/index.ts', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const output = await new Response(proc.stdout).text()
    await proc.exited

    expect(output.trim()).toBe(version)
  })

  it('outputs the version from package.json when -v is passed', async () => {
    const proc = Bun.spawn([process.execPath, 'src/index.ts', '-v'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const output = await new Response(proc.stdout).text()
    await proc.exited

    expect(output.trim()).toBe(version)
  })

  it('includes --version in help output', async () => {
    const proc = Bun.spawn([process.execPath, 'src/index.ts', '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const output = await new Response(proc.stdout).text()
    await proc.exited

    expect(output).toContain('--version')
    expect(output).toContain('-v')
    expect(output).toContain('display version number')
    expect(output).toContain('transactions')
    expect(output).toContain('accounts')
    expect(output).not.toMatch(/^\s+import\b/m)
    expect(output).not.toMatch(/^\s+export\b/m)
    expect(output).not.toMatch(/^\s+list\b/m)
  })
})
