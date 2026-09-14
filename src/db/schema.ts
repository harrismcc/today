import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const todoStatuses = ['todo', 'postponed', 'canceled', 'done'] as const

export type TodoStatus = (typeof todoStatuses)[number]

export const todos = sqliteTable(
  'todos',
  {
    id: text('id').primaryKey(),
    text: text('text').notNull(),
    status: text('status', { enum: todoStatuses }).notNull().default('todo'),
    scheduledDate: text('scheduled_date').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    check('todos_status_check', sql`${table.status} in ('todo', 'postponed', 'canceled', 'done')`),
    index('todos_scheduled_date_idx').on(table.scheduledDate),
  ],
)

export type Todo = typeof todos.$inferSelect
