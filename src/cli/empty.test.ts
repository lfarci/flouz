import { describe, it, expect, mock, afterEach } from 'bun:test'
import pc from 'picocolors'

const mockInfo = mock()

void mock.module('@clack/prompts', () => ({
  cancel: mock(),
  intro: mock(),
  isCancel: () => false,
  log: {
    info: mockInfo,
    error: mock(),
    message: mock(),
    success: mock(),
    warn: mock(),
  },
  note: mock(),
  outro: mock(),
  progress: mock(),
  select: mock(),
  spinner: mock(),
  text: mock(),
}))

const { emptyState } = await import('@/cli/empty')

describe('emptyState', () => {
  const originalNoColor = process.env.NO_COLOR

  afterEach(() => {
    process.env.NO_COLOR = originalNoColor
  })

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

  it('renders hint without dim when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1'
    mockInfo.mockClear()
    emptyState('message', 'plain hint')

    expect(mockInfo).toHaveBeenCalledTimes(2)
    expect(mockInfo).toHaveBeenCalledWith('message')
    expect(mockInfo).toHaveBeenCalledWith('plain hint')
  })
})
