# AI Providers

flouz uses the [Vercel AI SDK](https://sdk.vercel.ai) to interact with AI models. The provider is configured via environment variables so switching is a one-line change in `src/ai/`.

## Default Provider: GitHub Models

GitHub Models is the default because it is free with a GitHub Copilot subscription and requires no additional sign-up.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GITHUB_TOKEN` | Personal access token or Copilot token | required |
| `AI_MODEL` | Model name to use | `gpt-4o-mini` |
| `AI_BASE_URL` | API base URL | `https://models.inference.ai.azure.com` |

## Switching Providers

Change the import and constructor in `src/ai/` — the rest of the codebase is unaffected.

### GitHub Models (default)

```ts
import { createOpenAI } from "@ai-sdk/openai";

const provider = createOpenAI({
  baseURL: process.env.AI_BASE_URL ?? "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN,
});

const model = provider(process.env.AI_MODEL ?? "gpt-4o-mini");
```

### Anthropic

```ts
import { createAnthropic } from "@ai-sdk/anthropic";

const provider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const model = provider(process.env.AI_MODEL ?? "claude-3-5-haiku-20241022");
```

### Ollama (local, no API key needed)

```ts
import { createOllama } from "ollama-ai-provider";

const provider = createOllama();
const model = provider(process.env.AI_MODEL ?? "llama3.2");
```

## Structured Output with `generateObject`

All AI calls use `generateObject` with a Zod schema to get typed, validated output — never raw text that needs manual parsing:

```ts
import { generateObject } from "ai";
import { z } from "zod";

const result = await generateObject({
  model,
  schema: z.object({
    categoryId: z.string().uuid(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  }),
  prompt: `Categorize this transaction: ${counterparty} ${amount} EUR`,
});

// result.object is fully typed
const { categoryId, confidence, reasoning } = result.object;
```

## Security Rules

- **Never commit API keys** — always read from environment variables
- Use a `.env` file locally and add it to `.gitignore`
- In CI/CD, inject secrets via repository secrets, never hardcode them
