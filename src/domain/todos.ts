import { z } from 'zod'

export const todoStatuses = ['todo', 'done'] as const

export type TodoStatus = (typeof todoStatuses)[number]

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/

export const dateKeySchema = z.string().refine((value) => {
  if (!dateKeyPattern.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value
}, 'Expected a valid date in YYYY-MM-DD format')

export const todoTextSchema = z.string().trim().min(1, 'Todo text is required')
export const todoBodySchema = z.string().trim()
export const todoStatusSchema = z.enum(todoStatuses)
export const todoIdSchema = z.string().min(1, 'Todo id is required')

export const todoListFiltersSchema = z.object({
  scheduledDate: dateKeySchema.optional(),
  status: todoStatusSchema.optional(),
})

export const createTodoInputSchema = z.object({
  text: todoTextSchema,
  body: todoBodySchema.optional(),
  scheduledDate: dateKeySchema,
})

export const todoDetailsInputSchema = z.object({
  id: todoIdSchema,
  text: todoTextSchema,
  body: todoBodySchema.nullable(),
})

export const todoStatusInputSchema = z.object({
  id: todoIdSchema,
  status: todoStatusSchema,
})

export const rescheduleTodoInputSchema = z.object({
  id: todoIdSchema,
  scheduledDate: dateKeySchema,
})

export const acceptOverdueTodosInputSchema = z.object({
  scheduledDate: dateKeySchema,
})

export const todoIdInputSchema = z.object({ id: todoIdSchema })

export type TodoListFilters = z.infer<typeof todoListFiltersSchema>
export type CreateTodoInput = z.infer<typeof createTodoInputSchema>
export type TodoDetailsInput = z.infer<typeof todoDetailsInputSchema>
export type TodoStatusInput = z.infer<typeof todoStatusInputSchema>
export type RescheduleTodoInput = z.infer<typeof rescheduleTodoInputSchema>
export type AcceptOverdueTodosInput = z.infer<typeof acceptOverdueTodosInputSchema>

type OrderedTodo = {
  id: string
  scheduledDate: string
  createdAt: Date
}

type SchedulableTodo = OrderedTodo & {
  status: TodoStatus
}

export function sortTodos<T extends OrderedTodo>(todos: readonly T[]) {
  return [...todos].sort(
    (left, right) =>
      left.scheduledDate.localeCompare(right.scheduledDate) ||
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id),
  )
}

export function bucketTodos<T extends OrderedTodo>(todos: readonly T[]) {
  return sortTodos(todos).reduce<Record<string, T[]>>((byDay, todo) => {
    const day = byDay[todo.scheduledDate] ?? []
    day.push(todo)
    byDay[todo.scheduledDate] = day
    return byDay
  }, {})
}

export function getOverdueTodos<T extends SchedulableTodo>(
  todos: readonly T[],
  todayKey: string,
) {
  return sortTodos(
    todos.filter((todo) => todo.status !== 'done' && todo.scheduledDate < todayKey),
  )
}

export type TodoReconciliation<T> =
  | { type: 'replace'; todos: readonly T[] }
  | { type: 'upsert'; todo: T }
  | { type: 'upsert-many'; todos: readonly T[] }
  | { type: 'remove'; id: string }

export function reconcileTodos<T extends OrderedTodo>(
  current: readonly T[],
  reconciliation: TodoReconciliation<T>,
) {
  if (reconciliation.type === 'replace') return sortTodos(reconciliation.todos)
  if (reconciliation.type === 'remove') {
    return sortTodos(current.filter((todo) => todo.id !== reconciliation.id))
  }
  if (reconciliation.type === 'upsert-many') {
    const updatedIds = new Set(reconciliation.todos.map((todo) => todo.id))
    return sortTodos([
      ...current.filter((todo) => !updatedIds.has(todo.id)),
      ...reconciliation.todos,
    ])
  }

  return sortTodos([
    ...current.filter((todo) => todo.id !== reconciliation.todo.id),
    reconciliation.todo,
  ])
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return shifted.toISOString().slice(0, 10)
}

export function localDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function millisecondsUntilNextLocalDay(now: Date) {
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(1, nextDay.getTime() - now.getTime())
}
