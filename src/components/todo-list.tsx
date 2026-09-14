import { useMemo, useState } from "react"
import { Plus, ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import { useServerFn } from "@tanstack/react-start"
import { TodoItem } from "./todo-item"
import { useDoneSound } from "@/hooks/use-done-sound"
import { createTodo, deleteTodo, updateTodoStatus } from "@/data/todos"
import type { Todo, TodoStatus } from "@/db/schema"
import { authClient } from "@/lib/auth-client"

// A stable local YYYY-MM-DD key for a given date.
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function groupByDay(todos: Todo[]) {
  return todos.reduce<Record<string, Todo[]>>((byDay, todo) => {
    const day = byDay[todo.scheduledDate] ?? []
    day.push(todo)
    byDay[todo.scheduledDate] = day
    return byDay
  }, {})
}

export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [byDay, setByDay] = useState(() => groupByDay(initialTodos))
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState("")
  const playDone = useDoneSound()
  const createTodoMutation = useServerFn(createTodo)
  const deleteTodoMutation = useServerFn(deleteTodo)
  const updateTodoStatusMutation = useServerFn(updateTodoStatus)

  // The date currently in view, derived from a day offset relative to today.
  const viewed = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + offset)
    return d
  }, [offset])

  const key = dateKey(viewed)
  const todos = byDay[key] ?? []

  const setStatus = async (id: string, status: TodoStatus) => {
    const updated = await updateTodoStatusMutation({ data: { id, status } })
    if (status === "done") playDone()
    setByDay((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((todo) => (todo.id === id ? updated : todo)),
    }))
  }

  const removeTodo = async (id: string) => {
    await deleteTodoMutation({ data: { id } })
    setByDay((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([day, todos]) => [day, todos.filter((todo) => todo.id !== id)]),
      ),
    )
  }

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    const todo = await createTodoMutation({ data: { text, scheduledDate: key } })
    setByDay((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), todo],
    }))
    setDraft("")
  }

  const relative =
    offset === 0 ? "Today" : offset === -1 ? "Yesterday" : offset === 1 ? "Tomorrow" : viewed.toLocaleDateString(undefined, { weekday: "long" })

  const fullDate = viewed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  })

  const signOut = async () => {
    await authClient.signOut()
    window.location.replace("/login")
  }

  return (
    <section className="w-full max-w-xl">
      <header className="mb-4 sm:mb-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">{relative}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Previous day"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Next day"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        <h1 className="mt-1 font-hand text-3xl leading-tight text-foreground sm:mt-2 sm:text-5xl">{fullDate}</h1>
      </header>

      <ul className="divide-y divide-border/60">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onSetStatus={setStatus} onDelete={removeTodo} />
        ))}
      </ul>

      <form onSubmit={addTodo} className="flex items-center gap-3 border-t border-border/60 py-2.5 sm:gap-4 sm:py-3">
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground sm:size-6">
          <Plus className="size-4 sm:size-[1.125rem]" />
        </span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add something for today…"
          aria-label="Add a new todo"
          className="min-w-0 flex-1 bg-transparent font-hand text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none sm:text-xl"
        />
      </form>
    </section>
  )
}
