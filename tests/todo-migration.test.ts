import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

test('0007 preserves legacy postponement without misclassifying future-created todos', () => {
  const database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE user (id text PRIMARY KEY NOT NULL);
    INSERT INTO user VALUES ('user');
    CREATE TABLE todos (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      text text NOT NULL,
      status text DEFAULT 'todo' NOT NULL,
      scheduled_date text NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      deleted_at integer
    );
    INSERT INTO todos VALUES
      ('legacy', 'user', 'Moved before migration', 'postponed', '2026-09-20', 100, 200, NULL),
      ('future', 'user', 'Created for a future date', 'todo', '2026-10-01', 100, 100, NULL),
      ('done', 'user', 'Already complete', 'done', '2026-09-15', 100, 150, NULL);
  `)

  database.exec(readFileSync(new URL('../drizzle/0007_organic_azazel.sql', import.meta.url), 'utf8'))
  database.exec(
    "INSERT INTO todos VALUES ('both', 'user', 'Done after postponing', 'done', '2026-09-21', 250, 100, 300, NULL)",
  )

  const rows = database
    .prepare('SELECT id, status, postponed_at AS postponedAt FROM todos ORDER BY id')
    .all()
    .map((row) => ({ ...row }))

  assert.deepEqual(rows, [
    { id: 'both', status: 'done', postponedAt: 250 },
    { id: 'done', status: 'done', postponedAt: null },
    { id: 'future', status: 'todo', postponedAt: null },
    { id: 'legacy', status: 'todo', postponedAt: 200 },
  ])
  assert.throws(() =>
    database.exec(
      "INSERT INTO todos VALUES ('bad', 'user', 'Bad', 'postponed', '2026-09-15', NULL, 1, 1, NULL)",
    ),
  )
})

test('0008 adds optional todo bodies without changing existing rows', () => {
  const database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE todos (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      text text NOT NULL,
      status text DEFAULT 'todo' NOT NULL,
      scheduled_date text NOT NULL,
      postponed_at integer,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      deleted_at integer
    );
    INSERT INTO todos VALUES
      ('existing', 'user', 'Existing todo', 'todo', '2026-09-15', NULL, 100, 100, NULL);
  `)

  database.exec(
    readFileSync(new URL('../drizzle/0008_flaky_forgotten_one.sql', import.meta.url), 'utf8'),
  )
  database.exec(
    "INSERT INTO todos (id, user_id, text, body, status, scheduled_date, created_at, updated_at) VALUES ('detailed', 'user', 'Detailed todo', 'Notes and https://example.com', 'todo', '2026-09-15', 200, 200)",
  )

  const rows = database
    .prepare('SELECT id, body FROM todos ORDER BY id')
    .all()
    .map((row) => ({ ...row }))

  assert.deepEqual(rows, [
    { id: 'detailed', body: 'Notes and https://example.com' },
    { id: 'existing', body: null },
  ])
})
