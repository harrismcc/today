import { and, asc, eq, isNull, sql } from 'drizzle-orm'

import { db } from '@/db/index.server'
import { todos, type TodoStatus } from '@/db/schema'

export function listTodos(userId: string) {
  return db
    .select()
    .from(todos)
    .where(and(eq(todos.userId, userId), isNull(todos.deletedAt)))
    .orderBy(asc(todos.scheduledDate), asc(todos.createdAt))
    .all()
}

export async function insertTodo(
  userId: string,
  input: { text: string; scheduledDate: string },
) {
  const now = new Date()
  const todo = {
    id: crypto.randomUUID(),
    userId,
    text: input.text,
    status: 'todo' as const,
    scheduledDate: input.scheduledDate,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  await db.insert(todos).values(todo).run()

  return todo
}

export async function setTodoStatus(
  userId: string,
  input: { id: string; status: TodoStatus },
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

export async function postponeTodoToNextDay(userId: string, id: string) {
  const todo = await db
    .update(todos)
    .set({
      status: 'postponed',
      scheduledDate: sql`date(${todos.scheduledDate}, '+1 day')`,
      updatedAt: new Date(),
    })
    .where(and(eq(todos.id, id), eq(todos.userId, userId), isNull(todos.deletedAt)))
    .returning()
    .get()

  if (!todo) {
    throw new Error('Todo not found')
  }

  return todo
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
