import { and, asc, eq, isNull, lt, sql } from 'drizzle-orm'

import { db } from '@/db/index.server'
import { todos } from '@/db/schema'
import type {
  AcceptOverdueTodosInput,
  CreateTodoInput,
  RescheduleTodoInput,
  TodoDetailsInput,
  TodoListFilters,
  TodoStatusInput,
} from '@/domain/todos'

export function listTodos(userId: string, filters: TodoListFilters = {}) {
  return db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        isNull(todos.deletedAt),
        filters.scheduledDate
          ? eq(todos.scheduledDate, filters.scheduledDate)
          : undefined,
        filters.status ? eq(todos.status, filters.status) : undefined,
      ),
    )
    .orderBy(asc(todos.scheduledDate), asc(todos.createdAt), asc(todos.id))
    .all()
}

export async function insertTodo(userId: string, input: CreateTodoInput) {
  const now = new Date()
  const todo = {
    id: crypto.randomUUID(),
    userId,
    text: input.text,
    body: input.body || null,
    status: 'todo' as const,
    scheduledDate: input.scheduledDate,
    postponedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  await db.insert(todos).values(todo).run()

  return todo
}

export async function updateTodoDetails(
  userId: string,
  input: TodoDetailsInput,
) {
  const todo = await db
    .update(todos)
    .set({ text: input.text, body: input.body || null, updatedAt: new Date() })
    .where(and(eq(todos.id, input.id), eq(todos.userId, userId), isNull(todos.deletedAt)))
    .returning()
    .get()

  if (!todo) {
    throw new Error('Todo not found')
  }

  return todo
}

export async function setTodoStatus(
  userId: string,
  input: TodoStatusInput,
) {
  const todo = await db
    .update(todos)
    .set({ status: input.status, updatedAt: new Date() })
    .where(and(eq(todos.id, input.id), eq(todos.userId, userId), isNull(todos.deletedAt)))
    .returning()
    .get()

  if (!todo) {
    throw new Error('Todo not found')
  }

  return todo
}

export async function rescheduleTodoToDate(
  userId: string,
  input: RescheduleTodoInput,
) {
  const now = new Date()
  const todo = await db
    .update(todos)
    .set({
      scheduledDate: input.scheduledDate,
      postponedAt: sql`CASE
        WHEN ${input.scheduledDate} > ${todos.scheduledDate}
        THEN coalesce(${todos.postponedAt}, ${now.getTime()})
        ELSE ${todos.postponedAt}
      END`,
      updatedAt: now,
    })
    .where(and(eq(todos.id, input.id), eq(todos.userId, userId), isNull(todos.deletedAt)))
    .returning()
    .get()

  if (!todo) {
    throw new Error('Todo not found')
  }

  return todo
}

export async function acceptOverdueTodos(
  userId: string,
  input: AcceptOverdueTodosInput,
) {
  const now = new Date()

  return db
    .update(todos)
    .set({
      scheduledDate: input.scheduledDate,
      postponedAt: sql`coalesce(${todos.postponedAt}, ${now.getTime()})`,
      updatedAt: now,
    })
    .where(
      and(
        eq(todos.userId, userId),
        eq(todos.status, 'todo'),
        lt(todos.scheduledDate, input.scheduledDate),
        isNull(todos.deletedAt),
      ),
    )
    .returning()
    .all()
}

export async function softDeleteTodo(userId: string, id: string) {
  const now = new Date()
  const todo = await db
    .update(todos)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(todos.id, id), eq(todos.userId, userId), isNull(todos.deletedAt)))
    .returning({ id: todos.id })
    .get()

  if (!todo) {
    throw new Error('Todo not found')
  }

  return todo
}
