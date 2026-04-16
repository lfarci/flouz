import { mock, spyOn, describe, it, expect, beforeEach, afterEach } from 'bun:test'
import * as configModule from '@/config'

const chatMock = mock(() => 'mock-chat-model')
const createOpenAIMock = mock(() => ({ chat: chatMock }))

void mock.module('@ai-sdk/openai', () => ({
  createOpenAI: createOpenAIMock,
}))

import { resolveModelName, getModel, DEFAULT_MODEL, DEFAULT_BASE_URL } from '@/ai/client'

const originalAiModel = Bun.env.AI_MODEL
const originalGithubToken = Bun.env.GITHUB_TOKEN
const originalAiBaseUrl = Bun.env.AI_BASE_URL

beforeEach(() => {
  chatMock.mockReset()
  chatMock.mockReturnValue('mock-chat-model')
  createOpenAIMock.mockReset()
  createOpenAIMock.mockReturnValue({ chat: chatMock })
  delete Bun.env.AI_MODEL
  delete Bun.env.GITHUB_TOKEN
  delete Bun.env.AI_BASE_URL
})

afterEach(() => {
  if (originalAiModel !== undefined) Bun.env.AI_MODEL = originalAiModel
  else delete Bun.env.AI_MODEL
  if (originalGithubToken !== undefined) Bun.env.GITHUB_TOKEN = originalGithubToken
  else delete Bun.env.GITHUB_TOKEN
  if (originalAiBaseUrl !== undefined) Bun.env.AI_BASE_URL = originalAiBaseUrl
  else delete Bun.env.AI_BASE_URL
})

describe('resolveModelName', () => {
  it('returns DEFAULT_MODEL when no env var or config value is set', async () => {
    const spy = spyOn(configModule, 'readConfig').mockResolvedValue({})
    const name = await resolveModelName()
    spy.mockRestore()
    expect(name).toBe(DEFAULT_MODEL)
  })

  it('returns the AI_MODEL env var when set', async () => {
    Bun.env.AI_MODEL = 'custom/model-from-env'
    const name = await resolveModelName()
    expect(name).toBe('custom/model-from-env')
  })

  it('returns the config aiModel when AI_MODEL env var is not set', async () => {
    const spy = spyOn(configModule, 'readConfig').mockResolvedValue({
      aiModel: 'config/model',
    })
    const name = await resolveModelName()
    spy.mockRestore()
    expect(name).toBe('config/model')
  })
})

describe('getModel', () => {
  it('throws when GITHUB_TOKEN env and config token are both absent', async () => {
    const spy = spyOn(configModule, 'readConfig').mockResolvedValue({})
    await expect(getModel()).rejects.toThrow('GitHub token is required')
    spy.mockRestore()
  })

  it('creates the provider with the GITHUB_TOKEN env var', async () => {
    Bun.env.GITHUB_TOKEN = 'ghp_test_env_token'
    await getModel()
    expect(createOpenAIMock).toHaveBeenCalledWith({
      apiKey: 'ghp_test_env_token',
      baseURL: DEFAULT_BASE_URL,
    })
  })

  it('creates the provider with the githubToken from config', async () => {
    const spy = spyOn(configModule, 'readConfig').mockResolvedValue({
      githubToken: 'config_token_123',
    })
    await getModel()
    spy.mockRestore()
    expect(createOpenAIMock).toHaveBeenCalledWith({
      apiKey: 'config_token_123',
      baseURL: DEFAULT_BASE_URL,
    })
  })

  it('uses AI_BASE_URL env var instead of the default base URL', async () => {
    Bun.env.GITHUB_TOKEN = 'ghp_test_token'
    Bun.env.AI_BASE_URL = 'https://custom.ai.endpoint'
    await getModel()
    expect(createOpenAIMock).toHaveBeenCalledWith({
      apiKey: 'ghp_test_token',
      baseURL: 'https://custom.ai.endpoint',
    })
  })

  it('calls chat with the resolved model name', async () => {
    Bun.env.GITHUB_TOKEN = 'ghp_test_token'
    await getModel()
    expect(chatMock).toHaveBeenCalledWith(DEFAULT_MODEL)
  })
})
