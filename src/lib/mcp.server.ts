import {
  createMcpHandler,
  hostHeaderValidationResponse,
  McpServer,
  originValidationResponse,
  type AuthInfo,
} from '@modelcontextprotocol/server'
import { createDpopReplayStore } from 'better-auth/oauth2'
import { z } from 'zod'

import type { Todo } from '@/db/schema'
import {
  insertTodo,
  listTodos,
  rescheduleTodoToDate,
  setTodoStatus,
  softDeleteTodo,
  updateTodoDetails,
} from '@/data/todos.server'
import {
  createTodoInputSchema,
  dateKeySchema,
  rescheduleTodoInputSchema,
  todoDetailsInputSchema,
  todoIdInputSchema,
  todoListFiltersSchema,
  todoStatusInputSchema,
  todoStatusSchema,
} from '@/domain/todos'
import { createAuth } from '@/lib/auth.server'
import { mcpResource, mcpScope } from '@/lib/mcp-config.server'
import {
  createMcpProtectedHandlerWithJwksLoader,
  loadJwksFromAuthHandler,
} from '@/lib/mcp-jwks.server'

const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  body: z.string().nullable(),
  status: todoStatusSchema,
  scheduledDate: dateKeySchema,
  postponedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

function serializeTodo(todo: Todo) {
  return {
    id: todo.id,
    text: todo.text,
    body: todo.body,
    status: todo.status,
    scheduledDate: todo.scheduledDate,
    postponedAt: todo.postponedAt?.toISOString() ?? null,
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
      inputSchema: todoListFiltersSchema,
      outputSchema: z.object({ todos: z.array(todoSchema) }),
      annotations: { readOnlyHint: true },
    },
    async ({ scheduledDate, status }) => {
      const todos = (
        await listTodos(userId, { scheduledDate, status })
      ).map(serializeTodo)
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
        'Create a todo, optionally with a longer body containing notes or links, on a YYYY-MM-DD calendar date.',
      inputSchema: createTodoInputSchema,
      outputSchema: z.object({ todo: todoSchema }),
      annotations: { destructiveHint: false },
    },
    async ({ text, body, scheduledDate }) => {
      const output = {
        todo: serializeTodo(await insertTodo(userId, { text, body, scheduledDate })),
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      }
    },
  )

  server.registerTool(
    'update_todo_details',
    {
      title: 'Update todo details',
      description:
        'Update the title and optional body of one of the signed-in user’s todos. Send null to clear the body.',
      inputSchema: todoDetailsInputSchema,
      outputSchema: z.object({ todo: todoSchema }),
      annotations: { destructiveHint: false },
    },
    async ({ id, text, body }) => {
      const output = {
        todo: serializeTodo(await updateTodoDetails(userId, { id, text, body })),
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
      description: 'Set one of the signed-in user’s todos to todo or done.',
      inputSchema: todoStatusInputSchema,
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
    'reschedule_todo',
    {
      title: 'Reschedule todo',
      description:
        'Move one of the signed-in user’s todos to an absolute YYYY-MM-DD date.',
      inputSchema: rescheduleTodoInputSchema,
      outputSchema: z.object({ todo: todoSchema }),
      annotations: { destructiveHint: false },
    },
    async ({ id, scheduledDate }) => {
      const output = {
        todo: serializeTodo(
          await rescheduleTodoToDate(userId, { id, scheduledDate }),
        ),
      }

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
      inputSchema: todoIdInputSchema,
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
  const auth = createAuth()

  return auth.$context.then(({ internalAdapter }) =>
    createMcpProtectedHandlerWithJwksLoader(
      {
        issuer,
        audience: mcpResource,
        jwksLoader: () => loadJwksFromAuthHandler(auth.handler, `${issuer}/jwks`),
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
