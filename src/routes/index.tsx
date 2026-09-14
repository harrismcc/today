import { createFileRoute } from '@tanstack/react-router'

import { TodoList } from '@/components/todo-list'
import { getTodos } from '@/data/todos'

export const Route = createFileRoute('/')({
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
