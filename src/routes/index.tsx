import { createFileRoute } from '@tanstack/react-router'

import { TodoList } from '@/components/todo-list'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-8 sm:py-20">
      <TodoList />
    </main>
  )
}
