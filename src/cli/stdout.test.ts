import { describe, expect, it, spyOn } from 'bun:test'
import { writeStdout } from '@/cli/stdout'

describe('writeStdout', () => {
  it('resolves when Bun passes null to the stdout callback on success', async () => {
    const writeSpy = spyOn(process.stdout, 'write').mockImplementation(
      ((output: unknown, callback?: ((error: Error | null | undefined) => void) | string) => {
        if (typeof callback === 'function') {
          callback(null)
        }
        return true
      }) as typeof process.stdout.write
    )

    await expect(writeStdout('hello\n')).resolves.toBeUndefined()

    writeSpy.mockRestore()
  })

  it('rejects when the stdout callback receives an error', async () => {
    const writeError = new Error('write failed')
    const writeSpy = spyOn(process.stdout, 'write').mockImplementation(
      ((output: unknown, callback?: ((error: Error | null | undefined) => void) | string) => {
        if (typeof callback === 'function') {
          callback(writeError)
        }
        return true
      }) as typeof process.stdout.write
    )

    await expect(writeStdout('hello\n')).rejects.toThrow('write failed')

    writeSpy.mockRestore()
  })

  it('rejects when stdout emits an error event', async () => {
    const writeSpy = spyOn(process.stdout, 'write').mockImplementation(
      ((output: unknown, callback?: ((error: Error | null | undefined) => void) | string) => {
        if (typeof callback === 'function') {
          queueMicrotask(() => process.stdout.emit('error', new Error('broken pipe')))
        }
        return true
      }) as typeof process.stdout.write
    )

    await expect(writeStdout('hello\n')).rejects.toThrow('broken pipe')

    writeSpy.mockRestore()
  })
})
