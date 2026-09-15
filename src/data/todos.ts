import { createServerFn } from '@tanstack/react-start'

import { todoStatuses, type TodoStatus } from '@/db/schema'

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/

function isDateKey(value: string) {
  if (!dateKeyPattern.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.toISOString().slice(0, 10) === value
}

function validateCreateInput(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Invalid todo')

  const { text, scheduledDate } = input as Record<string, unknown>
  if (typeof text !== 'string' || !text.trim()) throw new Error('Todo text is required')
  if (typeof scheduledDate !== 'string' || !isDateKey(scheduledDate)) {
    throw new Error('A valid scheduled date is required')
  }

  return { text: text.trim(), scheduledDate }
}

function validateStatusInput(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Invalid todo update')

  const { id, status } = input as Record<string, unknown>
  if (typeof id !== 'string' || !id) throw new Error('Todo id is required')
  if (typeof status !== 'string' || !todoStatuses.includes(status as TodoStatus)) {
    throw new Error('Invalid todo status')
  }

  return { id, status: status as TodoStatus }
}

function validateIdInput(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Invalid todo')

  const { id } = input as Record<string, unknown>
  if (typeof id !== 'string' || !id) throw new Error('Todo id is required')

  return { id }
}

function validateDeferInput(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Invalid todo')

  const { id, scheduledDate } = input as Record<string, unknown>
  if (typeof id !== 'string' || !id) throw new Error('Todo id is required')
  if (typeof scheduledDate !== 'string' || !isDateKey(scheduledDate)) {
    throw new Error('A valid scheduled date is required')
  }

  return { id, scheduledDate }
}

export const getTodos = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSession } = await import('@/lib/auth-session.server')
  const session = await requireSession()

  const { listTodos } = await import('./todos.server')
  return listTodos(session.user.id)
})

export const createTodo = createServerFn({ method: 'POST' })
  .validator(validateCreateInput)
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { insertTodo } = await import('./todos.server')
    return insertTodo(session.user.id, data)
  })

export const updateTodoStatus = createServerFn({ method: 'POST' })
  .validator(validateStatusInput)
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { setTodoStatus } = await import('./todos.server')
    return setTodoStatus(session.user.id, data)
  })

export const postponeTodo = createServerFn({ method: 'POST' })
  .validator(validateIdInput)
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { postponeTodoToNextDay } = await import('./todos.server')
    return postponeTodoToNextDay(session.user.id, data.id)
  })

export const deferTodo = createServerFn({ method: 'POST' })
  .validator(validateDeferInput)
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { deferTodoToDate } = await import('./todos.server')
    return deferTodoToDate(session.user.id, data)
  })

export const deleteTodo = createServerFn({ method: 'POST' })
  .validator(validateIdInput)
  .handler(async ({ data }) => {
    const { requireSession } = await import('@/lib/auth-session.server')
    const session = await requireSession()

    const { softDeleteTodo } = await import('./todos.server')
    return softDeleteTodo(session.user.id, data.id)
  })
