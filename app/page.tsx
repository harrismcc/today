import { TodoList } from "@/components/todo-list"

export default function Page() {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-8 sm:py-20">
      <TodoList />
    </main>
  )
}
