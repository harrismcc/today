import { asc, eq } from 'drizzle-orm'

import { db } from '@/db/index.server'
import { todos, type TodoStatus } from '@/db/schema'

export function listTodos() {
  return db.select().from(todos).orderBy(asc(todos.scheduledDate), asc(todos.createdAt)).all()
}

export function insertTodo(input: { text: string; scheduledDate: string }) {
  const now = new Date()
  const todo = {
    id: crypto.randomUUID(),
    text: input.text,
    status: 'todo' as const,
    scheduledDate: input.scheduledDate,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(todos).values(todo).run()

  return todo
}

export function setTodoStatus(input: { id: string; status: TodoStatus }) {
  const todo = db
    .update(todos)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(todos.id, input.id))
    .returning()
    .get()

  if (!todo) {
    throw new Error('Todo not found')
  }

  return todo
}
