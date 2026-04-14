import { z } from 'zod'
import { mkdir } from 'node:fs/promises'

const CONFIG_DIR = `${Bun.env.XDG_CONFIG_HOME ?? `${Bun.env.HOME}/.config`}/flouz`
const CONFIG_FILE = `${CONFIG_DIR}/config.json`
const DEFAULT_DB_PATH = `${CONFIG_DIR}/flouz.db`

const ConfigSchema = z.object({
  dbPath: z.string().optional(),
  githubToken: z.string().optional(),
  aiModel: z.string().optional(),
  aiBaseUrl: z.string().optional(),
})

export type Config = z.infer<typeof ConfigSchema>

export async function readConfig(): Promise<Config> {
  const file = Bun.file(CONFIG_FILE)
  if (!(await file.exists())) return {}
  try {
    const raw = await file.json()
    const result = ConfigSchema.safeParse(raw)
    return result.success ? result.data : {}
  } catch {
    return {}
  }
}

export async function writeConfig(updates: Partial<Config>): Promise<void> {
  const current = await readConfig()
  const next = { ...current, ...updates }
  await mkdir(CONFIG_DIR, { recursive: true })
  await Bun.write(CONFIG_FILE, JSON.stringify(next, null, 2))
}

export async function resolveDbPath(): Promise<string> {
  if (Bun.env.DB_PATH) return Bun.env.DB_PATH
  const config = await readConfig()
  return config.dbPath ?? DEFAULT_DB_PATH
}
