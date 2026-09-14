export const mcpResource = import.meta.env.PROD
  ? 'https://today.harrismccullers.com/mcp'
  : 'http://localhost:3000/mcp'

export const mcpScope = 'mcp:todos'
