import { createFileRoute, redirect } from '@tanstack/react-router'

import { CleanupMode } from '@/components/cleanup-mode'
import { getTodos } from '@/data/todos'
import { getSession } from '@/lib/auth-functions'

export const Route = createFileRoute('/cleanup')({
  beforeLoad: async () => {
    if (!(await getSession())) throw redirect({ to: '/login' })
  },
  loader: async () => (await getTodos()).filter((todo) => todo.status !== 'done'),
  head: () => ({ meta: [{ title: 'Clean up — Today' }] }),
  component: Cleanup,
})

function Cleanup() {
  const todos = Route.useLoaderData()

  return (
    <main className="flex min-h-screen items-start justify-center overflow-hidden px-4 py-8 sm:py-16">
      <CleanupMode initialTodos={todos} />
    </main>
  )
}
