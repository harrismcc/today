import { useMemo, useState } from "react"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { TodoItem, type Todo, type Status } from "./todo-item"
import { useDoneSound } from "@/hooks/use-done-sound"

// A stable local YYYY-MM-DD key for a given date.
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const TODAY_KEY = dateKey(new Date())

const INITIAL: Record<string, Todo[]> = {
  [TODAY_KEY]: [
    { id: "1", text: "Water the plants", status: "todo" },
    { id: "2", text: "Reply to Sam's email", status: "todo" },
    { id: "3", text: "Draft the weekly notes", status: "todo" },
  ],
}

export function TodoList() {
  const [byDay, setByDay] = useState<Record<string, Todo[]>>(INITIAL)
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState("")
  const playDone = useDoneSound()

  // The date currently in view, derived from a day offset relative to today.
  const viewed = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + offset)
    return d
  }, [offset])

  const key = dateKey(viewed)
  const todos = byDay[key] ?? []

  const setStatus = (id: string, status: Status) => {
    if (status === "done") playDone()
    setByDay((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((t) => (t.id === id ? { ...t, status } : t)),
    }))
  }

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setByDay((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), { id: crypto.randomUUID(), text, status: "todo" }],
    }))
    setDraft("")
  }

  const relative =
    offset === 0 ? "Today" : offset === -1 ? "Yesterday" : offset === 1 ? "Tomorrow" : viewed.toLocaleDateString(undefined, { weekday: "long" })

  const fullDate = viewed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  })

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
          </div>
        </div>
        <h1 className="mt-1 font-hand text-3xl leading-tight text-foreground sm:mt-2 sm:text-5xl">{fullDate}</h1>
      </header>

      <ul className="divide-y divide-border/60">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onSetStatus={setStatus} />
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
