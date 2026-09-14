import { createMcpProtectedRequestHandler } from '@better-auth/mcp'
import {
  createMcpHandler,
  hostHeaderValidationResponse,
  McpServer,
  originValidationResponse,
  type AuthInfo,
} from '@modelcontextprotocol/server'
import { createDpopReplayStore } from 'better-auth/oauth2'
import { z } from 'zod'

import { todoStatuses, type Todo } from '@/db/schema'
import {
  insertTodo,
  listTodos,
  setTodoStatus,
  softDeleteTodo,
} from '@/data/todos.server'
import { createAuth } from '@/lib/auth.server'
import { mcpResource, mcpScope } from '@/lib/mcp-config.server'

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/

const dateKeySchema = z.string().refine((value) => {
  if (!dateKeyPattern.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value
}, 'Expected a valid date in YYYY-MM-DD format')

const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: z.enum(todoStatuses),
  scheduledDate: dateKeySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

function serializeTodo(todo: Todo) {
  return {
    id: todo.id,
    text: todo.text,
    status: todo.status,
    scheduledDate: todo.scheduledDate,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  }
}

function requestUserId(authInfo: AuthInfo | undefined) {
  const userId = authInfo?.extra?.userId
  if (typeof userId !== 'string' || !userId) throw new Error('Unauthorized')
  return userId
}

const mcpHandler = createMcpHandler(({ authInfo }) => {
  const userId = requestUserId(authInfo)
  const server = new McpServer({ name: 'today', version: '1.0.0' })

  server.registerTool(
    'list_todos',
    {
      title: 'List todos',
      description:
        'List the signed-in user’s todos, optionally filtered by calendar date or status.',
      inputSchema: z.object({
        scheduledDate: dateKeySchema.optional(),
        status: z.enum(todoStatuses).optional(),
      }),
      outputSchema: z.object({ todos: z.array(todoSchema) }),
      annotations: { readOnlyHint: true },
    },
    async ({ scheduledDate, status }) => {
      const todos = (await listTodos(userId))
        .filter((todo) => !scheduledDate || todo.scheduledDate === scheduledDate)
        .filter((todo) => !status || todo.status === status)
        .map(serializeTodo)
      const output = { todos }

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      }
    },
  )

  server.registerTool(
    'create_todo',
    {
      title: 'Create todo',
      description:
        'Create a todo for the signed-in user on a YYYY-MM-DD calendar date.',
      inputSchema: z.object({
        text: z.string().trim().min(1, 'Todo text is required'),
        scheduledDate: dateKeySchema,
      }),
      outputSchema: z.object({ todo: todoSchema }),
      annotations: { destructiveHint: false },
    },
    async ({ text, scheduledDate }) => {
      const output = {
        todo: serializeTodo(await insertTodo(userId, { text, scheduledDate })),
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      }
    },
  )

  server.registerTool(
    'set_todo_status',
    {
      title: 'Set todo status',
      description: 'Set one of the signed-in user’s todos to todo, postponed, or done.',
      inputSchema: z.object({
        id: z.string().min(1, 'Todo id is required'),
        status: z.enum(todoStatuses),
      }),
      outputSchema: z.object({ todo: todoSchema }),
      annotations: { destructiveHint: false },
    },
    async ({ id, status }) => {
      const output = { todo: serializeTodo(await setTodoStatus(userId, { id, status })) }

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      }
    },
  )

  server.registerTool(
    'delete_todo',
    {
      title: 'Delete todo',
      description: 'Delete one of the signed-in user’s todos.',
      inputSchema: z.object({ id: z.string().min(1, 'Todo id is required') }),
      outputSchema: z.object({ id: z.string() }),
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      const output = await softDeleteTodo(userId, id)

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      }
    },
  )

  return server
})

function accessToken(request: Request) {
  const match = /^(?:Bearer|DPoP)[ \t]+(\S+)$/i.exec(
    request.headers.get('authorization') ?? '',
  )
  if (!match) throw new Error('Verified access token is missing')
  return match[1]
}

function authenticatedMcpHandler(request: Request) {
  const issuer = new URL('/api/auth', request.url).href

  return createAuth().$context.then(({ internalAdapter }) =>
    createMcpProtectedRequestHandler(
      {
        issuer,
        audience: mcpResource,
        jwksUrl: `${issuer}/jwks`,
        requiredScopes: [mcpScope],
        dpop: { replayStore: createDpopReplayStore(internalAdapter) },
      },
      (authenticatedRequest, claims) => {
        if (typeof claims.sub !== 'string' || !claims.sub) {
          throw new Error('Access token subject is missing')
        }
        if (typeof claims.client_id !== 'string' || !claims.client_id) {
          throw new Error('Access token client is missing')
        }

        const authInfo: AuthInfo = {
          token: accessToken(authenticatedRequest),
          clientId: claims.client_id,
          scopes:
            typeof claims.scope === 'string'
              ? claims.scope.split(' ').filter(Boolean)
              : [],
          expiresAt: claims.exp,
          resource: new URL(mcpResource),
          extra: { userId: claims.sub },
        }

        return mcpHandler.fetch(authenticatedRequest, { authInfo })
      },
    )(request),
  )
}

const mcpHostname = new URL(mcpResource).hostname

export function handleMcpRequest(request: Request) {
  const rejected =
    hostHeaderValidationResponse(request, [mcpHostname]) ??
    originValidationResponse(request, [mcpHostname])

  return rejected ?? authenticatedMcpHandler(request)
}
