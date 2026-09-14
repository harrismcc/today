import { defineConfig } from 'drizzle-kit'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const databaseUrl = process.env.DATABASE_URL ?? './data/tasks.db'

if (databaseUrl !== ':memory:') {
  mkdirSync(dirname(resolve(databaseUrl)), { recursive: true })
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: databaseUrl,
  },
})
