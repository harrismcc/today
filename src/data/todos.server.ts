import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/db/index.server'
import { todos, type TodoStatus } from '@/db/schema'

export function listTodos(userId: string) {
  return db
    .select()
    .from(todos)
    .where(eq(todos.userId, userId))
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
    .where(and(eq(todos.id, input.id), eq(todos.userId, userId)))
    .returning()
    .get()

  if (!todo) {
    throw new Error('Todo not found')
  }

  return todo
}
