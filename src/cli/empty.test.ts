import { describe, it, expect, mock } from 'bun:test'
import pc from 'picocolors'

const mockInfo = mock()

void mock.module('@clack/prompts', () => ({
  log: { info: mockInfo },
}))

const { emptyState } = await import('@/cli/empty')

describe('emptyState', () => {
  it('calls log.info with the message', () => {
    mockInfo.mockClear()
    emptyState('test message')

    expect(mockInfo).toHaveBeenCalledWith('test message')
    expect(mockInfo).toHaveBeenCalledTimes(1)
  })

  it('calls log.info twice when hint is provided', () => {
    mockInfo.mockClear()
    const message = 'test message'
    const hint = 'test hint'

    emptyState(message, hint)

    expect(mockInfo).toHaveBeenCalledTimes(2)
    expect(mockInfo).toHaveBeenCalledWith(message)
    expect(mockInfo).toHaveBeenCalledWith(pc.dim(hint))
  })

  it('calls log.info exactly once when hint is undefined', () => {
    mockInfo.mockClear()
    emptyState('no hint here')

    expect(mockInfo).toHaveBeenCalledTimes(1)
    expect(mockInfo).toHaveBeenCalledWith('no hint here')
  })
})
