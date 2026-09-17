import assert from 'node:assert/strict'
import test from 'node:test'

import {
  bucketTodos,
  calendarDaysBetween,
  createTodoInputSchema,
  dateKeySchema,
  getOverdueTodos,
  millisecondsUntilNextLocalDay,
  reconcileTodos,
  shiftDateKey,
  todoDetailsInputSchema,
  todoStatusSchema,
} from '../src/domain/todos.ts'

const createdAt = new Date('2026-09-15T12:00:00.000Z')

function todo(id: string, scheduledDate: string, createdOffset = 0) {
  return {
    id,
    scheduledDate,
    createdAt: new Date(createdAt.getTime() + createdOffset),
  }
}

test('shared input contracts reject impossible dates and the retired postponed status', () => {
  assert.equal(dateKeySchema.safeParse('2026-02-29').success, false)
  assert.equal(dateKeySchema.safeParse('2028-02-29').success, true)
  assert.equal(todoStatusSchema.safeParse('postponed').success, false)
  assert.deepEqual(
    createTodoInputSchema.parse({
      text: '  future task  ',
      body: '  Notes at https://example.com  ',
      scheduledDate: '2026-10-01',
    }),
    {
      text: 'future task',
      body: 'Notes at https://example.com',
      scheduledDate: '2026-10-01',
    },
  )
  assert.deepEqual(
    todoDetailsInputSchema.parse({ id: 'todo', text: ' Updated ', body: null }),
    { id: 'todo', text: 'Updated', body: null },
  )
})

test('reconciliation moves an updated todo between canonical buckets without duplication', () => {
  const current = [
    todo('later-created', '2026-09-15', 20),
    todo('tomorrow', '2026-09-16', 0),
    todo('earlier-created', '2026-09-15', 10),
  ]
  const moved = { ...current[0], scheduledDate: '2026-09-16' }

  const reconciled = reconcileTodos(current, { type: 'upsert', todo: moved })
  const buckets = bucketTodos(reconciled)

  assert.deepEqual(buckets['2026-09-15'].map(({ id }) => id), ['earlier-created'])
  assert.deepEqual(buckets['2026-09-16'].map(({ id }) => id), [
    'tomorrow',
    'later-created',
  ])
  assert.equal(reconciled.filter(({ id }) => id === moved.id).length, 1)
})

test('bulk reconciliation adds unseen todos and replaces existing rows', () => {
  const current = [
    todo('existing', '2026-09-14'),
    todo('unchanged', '2026-09-15'),
  ]
  const accepted = [
    { ...current[0], scheduledDate: '2026-09-16' },
    todo('unseen', '2026-09-16', 10),
  ]

  const reconciled = reconcileTodos(current, { type: 'upsert-many', todos: accepted })

  assert.deepEqual(
    reconciled.map(({ id, scheduledDate }) => ({ id, scheduledDate })),
    [
      { id: 'unchanged', scheduledDate: '2026-09-15' },
      { id: 'existing', scheduledDate: '2026-09-16' },
      { id: 'unseen', scheduledDate: '2026-09-16' },
    ],
  )
})

test('overdue todos include only unfinished tasks before the local day', () => {
  const todos = [
    { ...todo('oldest', '2026-09-13'), status: 'todo' as const },
    { ...todo('done-earlier', '2026-09-14'), status: 'done' as const },
    { ...todo('earlier', '2026-09-14'), status: 'todo' as const },
    { ...todo('today', '2026-09-15'), status: 'todo' as const },
    { ...todo('future', '2026-09-16'), status: 'todo' as const },
  ]

  assert.deepEqual(
    getOverdueTodos(todos, '2026-09-15').map(({ id }) => id),
    ['oldest', 'earlier'],
  )
})

test('calendar-day math advances across DST using date keys and local midnight', () => {
  const springForwardMidnight = new Date(2026, 2, 8, 0, 0, 0)

  assert.equal(shiftDateKey('2026-03-08', 1), '2026-03-09')
  assert.equal(millisecondsUntilNextLocalDay(springForwardMidnight), 23 * 60 * 60 * 1000)
})

test('deferred days measure calendar distance from the original scheduled date', () => {
  assert.equal(calendarDaysBetween('2026-09-15', '2026-09-16'), 1)
  assert.equal(calendarDaysBetween('2026-09-15', '2026-09-18'), 3)
  assert.equal(calendarDaysBetween('2026-09-16', '2026-09-15'), 0)
})
