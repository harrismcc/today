import { createFileRoute, redirect } from '@tanstack/react-router'

import { TodoList } from '@/components/todo-list'
import { getTodos } from '@/data/todos'
import { getSession } from '@/lib/auth-functions'

export const Route = createFileRoute('/')({
  gcTime: 0,
  beforeLoad: async () => {
    if (!(await getSession())) throw redirect({ to: '/login' })
  },
  loader: () => getTodos(),
  component: Home,
})

function Home() {
  const todos = Route.useLoaderData()

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-8 sm:py-20">
      <TodoList initialTodos={todos} />
    </main>
  )
}
