import { createOpenAI } from '@ai-sdk/openai'
import { readConfig } from '@/config'

export const DEFAULT_MODEL = 'openai/gpt-4o-mini'
export const DEFAULT_BASE_URL = 'https://models.github.ai/inference'

export async function resolveModelName(): Promise<string> {
  const config = await readConfig()
  return Bun.env.AI_MODEL ?? config.aiModel ?? DEFAULT_MODEL
}

export async function getModel() {
  const config = await readConfig()
  const token = Bun.env.GITHUB_TOKEN ?? config.githubToken
  if (!token) {
    throw new Error(
      'GitHub token is required for AI categorization. Set GITHUB_TOKEN env var or run: flouz config set github-token <token>',
    )
  }
  const baseURL = Bun.env.AI_BASE_URL ?? config.aiBaseUrl ?? DEFAULT_BASE_URL
  const modelName = await resolveModelName()
  const provider = createOpenAI({ apiKey: token, baseURL })
  return provider.chat(modelName)
}
