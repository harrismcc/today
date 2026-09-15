import { createServerFn } from '@tanstack/react-start'

import {
  createTodoInputSchema,
  rescheduleTodoInputSchema,
  todoDetailsInputSchema,
  todoIdInputSchema,
  todoStatusInputSchema,
} from '@/domain/todos'

export const getTodos = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSession } = await import('@/lib/auth-session.server')
  const session = await requireSession()

  const { listTodos } = await import('./todos.server')
  return listTodos(session.user.id)
})

export const createTodo = createServerFn({ method: 'POST' })
  .validator((input) => createTodoInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { insertTodo } = await import('./todos.server')
    return insertTodo(session.user.id, data)
  })

export const saveTodoDetails = createServerFn({ method: 'POST' })
  .validator((input) => todoDetailsInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { updateTodoDetails } = await import('./todos.server')
    return updateTodoDetails(session.user.id, data)
  })

export const updateTodoStatus = createServerFn({ method: 'POST' })
  .validator((input) => todoStatusInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { setTodoStatus } = await import('./todos.server')
    return setTodoStatus(session.user.id, data)
  })

export const rescheduleTodo = createServerFn({ method: 'POST' })
  .validator((input) => rescheduleTodoInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { rescheduleTodoToDate } = await import('./todos.server')
    return rescheduleTodoToDate(session.user.id, data)
  })

// Compatibility alias while CleanupMode migrates to the canonical absolute operation.
export const deferTodo = rescheduleTodo

export const deleteTodo = createServerFn({ method: 'POST' })
  .validator((input) => todoIdInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { softDeleteTodo } = await import('./todos.server')
    return softDeleteTodo(session.user.id, data.id)
  })
