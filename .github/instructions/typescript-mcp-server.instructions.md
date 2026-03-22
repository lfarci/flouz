---
description: 'Instructions for building Model Context Protocol (MCP) servers using the TypeScript SDK'
applyTo: '**/*.ts, **/*.js, **/package.json'
---

# TypeScript MCP Server Development

## Instructions

- Use the **@modelcontextprotocol/sdk** npm package: `npm install @modelcontextprotocol/sdk`
- Import from specific paths: `@modelcontextprotocol/sdk/server/mcp.js`, `@modelcontextprotocol/sdk/server/stdio.js`, etc.
- Use `McpServer` class for high-level server implementation with automatic protocol handling
- Use `Server` class for low-level control with manual request handlers
- Use **zod** for input/output schema validation: `npm install zod@3`
- Always provide `title` field for tools, resources, and prompts for better UI display
- Use `registerTool()`, `registerResource()`, and `registerPrompt()` methods (recommended over older APIs)
- Define schemas using zod: `{ inputSchema: { param: z.string() }, outputSchema: { result: z.string() } }`
- Return both `content` (for display) and `structuredContent` (for structured data) from tools
- For local integrations, use `StdioServerTransport` for stdio-based communication
- Create new transport instances per request to prevent request ID collisions (stateless mode)
- Use `ResourceTemplate` for dynamic resources with URI parameters: `new ResourceTemplate('resource://{param}', { list: undefined })`
- Test servers with MCP Inspector: `npx @modelcontextprotocol/inspector`

## Best Practices

- Keep tool implementations focused on single responsibilities
- Provide clear, descriptive titles and descriptions for LLM understanding
- Use proper TypeScript types for all parameters and return values
- Implement comprehensive error handling with try-catch blocks
- Return `isError: true` in tool results for error conditions
- Use async/await for all asynchronous operations
- Close database connections and clean up resources properly
- Validate input parameters before processing
- Use structured logging for debugging without polluting stdout/stderr
- Consider security implications when exposing file system or network access
- Use environment variables for configuration (ports, API keys, etc.)

## Common Patterns

### Basic Server Setup (stdio) — use for finance-mcp
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({ name: 'finance-mcp', version: '1.0.0' })

server.registerTool('query-transactions', {
  title: 'Query Transactions',
  description: 'Query personal finance transactions from SQLite',
  inputSchema: {
    from: z.string().optional().describe('Start date yyyy-MM-dd'),
    to: z.string().optional().describe('End date yyyy-MM-dd'),
    category: z.string().optional()
  },
  outputSchema: { transactions: z.array(z.unknown()), total: z.number() }
}, async (params) => {
  try {
    const result = await queryTransactions(params)
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result
    }
  } catch (err: unknown) {
    return {
      content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
      isError: true
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
```

### Error Handling
```typescript
server.registerTool('risky-operation', {
  title: 'Risky Operation',
  inputSchema: { input: z.string() },
}, async ({ input }) => {
  try {
    const result = await performOperation(input)
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result
    }
  } catch (err: unknown) {
    return {
      content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
      isError: true
    }
  }
})
```
