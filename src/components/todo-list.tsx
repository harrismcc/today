import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCheck, ChevronLeft, ChevronRight, ListChecks, Plus } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useSwipeable } from "react-swipeable"
import { Link } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import confetti from "canvas-confetti"
import { AppMenu } from "./app-menu"
import { TodoDetailsDialog } from "./todo-details-dialog"
import { TodoItem } from "./todo-item"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { play } from "@foleyjs/react"
import {
  acceptOverdueTodos,
  createTodo,
  deleteTodo,
  getTodos,
  rescheduleTodo,
  saveTodoDetails,
  updateTodoStatus,
} from "@/data/todos"
import type { Todo } from "@/db/schema"
import {
  bucketTodos,
  getOverdueTodos,
  localDateFromKey,
  localDateKey,
  millisecondsUntilNextLocalDay,
  reconcileTodos,
  shiftDateKey,
  sortTodos,
  type TodoStatus,
} from "@/domain/todos"
import { cn } from "@/lib/utils"

const TODO_STALE_TIME = 5 * 60 * 1000
const STALE_CHECK_INTERVAL = 60 * 1000

export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todoItems, setTodoItems] = useState(() => sortTodos(initialTodos))
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState("")
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [todayKey, setTodayKey] = useState(() => localDateKey(new Date()))
  const [pendingTodoIds, setPendingTodoIds] = useState<ReadonlySet<string>>(() => new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [isAcceptingOverdue, setIsAcceptingOverdue] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchedAt = useRef(Date.now())
  const localDataVersion = useRef(0)
  const refreshInFlight = useRef<Promise<unknown> | null>(null)
  const pendingTodoIdsRef = useRef(new Set<string>())
  const createInFlight = useRef(false)
  const acceptOverdueInFlight = useRef(false)
  const getTodosQuery = useServerFn(getTodos)
  const acceptOverdueTodosMutation = useServerFn(acceptOverdueTodos)
  const createTodoMutation = useServerFn(createTodo)
  const deleteTodoMutation = useServerFn(deleteTodo)
  const rescheduleTodoMutation = useServerFn(rescheduleTodo)
  const saveTodoDetailsMutation = useServerFn(saveTodoDetails)
  const updateTodoStatusMutation = useServerFn(updateTodoStatus)

  const byDay = useMemo(() => bucketTodos(todoItems), [todoItems])
  const overdueTodos = useMemo(
    () => getOverdueTodos(todoItems, todayKey),
    [todoItems, todayKey],
  )

  const refreshTodos = useCallback(() => {
    if (refreshInFlight.current) return refreshInFlight.current

    const version = localDataVersion.current
    const refresh = getTodosQuery()
      .then((latestTodos) => {
        if (localDataVersion.current !== version) return

        setTodoItems((current) =>
          reconcileTodos(current, { type: "replace", todos: latestTodos }),
        )
        lastFetchedAt.current = Date.now()
      })
      .catch(() => setError("Todos could not be refreshed. Try again."))
      .finally(() => {
        refreshInFlight.current = null
      })

    refreshInFlight.current = refresh
    return refresh
  }, [getTodosQuery])

  useEffect(() => {
    let midnightTimer = 0

    const syncLocalDay = () => {
      const now = new Date()
      setTodayKey(localDateKey(now))
      window.clearTimeout(midnightTimer)
      midnightTimer = window.setTimeout(
        syncLocalDay,
        millisecondsUntilNextLocalDay(now) + 50,
      )
    }
    const syncVisibleLocalDay = () => {
      if (document.visibilityState === "visible") syncLocalDay()
    }

    syncLocalDay()
    window.addEventListener("focus", syncLocalDay)
    document.addEventListener("visibilitychange", syncVisibleLocalDay)

    return () => {
      window.clearTimeout(midnightTimer)
      window.removeEventListener("focus", syncLocalDay)
      document.removeEventListener("visibilitychange", syncVisibleLocalDay)
    }
  }, [])

  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - lastFetchedAt.current < TODO_STALE_TIME) return

      void refreshTodos()
    }

    const interval = window.setInterval(refreshIfStale, STALE_CHECK_INTERVAL)
    window.addEventListener("focus", refreshIfStale)
    document.addEventListener("visibilitychange", refreshIfStale)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refreshIfStale)
      document.removeEventListener("visibilitychange", refreshIfStale)
    }
  }, [refreshTodos])

  const key = useMemo(() => shiftDateKey(todayKey, offset), [offset, todayKey])
  const viewed = useMemo(() => localDateFromKey(key), [key])
  const todos = byDay[key] ?? []
  const selectedTodo = todoItems.find((todo) => todo.id === selectedTodoId)

  const runTodoMutation = useCallback(async <T,>(id: string, mutation: () => Promise<T>) => {
    if (acceptOverdueInFlight.current || pendingTodoIdsRef.current.has(id)) return undefined

    pendingTodoIdsRef.current.add(id)
    setPendingTodoIds(new Set(pendingTodoIdsRef.current))
    setError(null)

    try {
      return await mutation()
    } catch {
      setError("That todo could not be updated. Try again.")
      play("error")
      return undefined
    } finally {
      pendingTodoIdsRef.current.delete(id)
      setPendingTodoIds(new Set(pendingTodoIdsRef.current))
    }
  }, [])

  const setStatus = async (id: string, status: TodoStatus, origin: { x: number; y: number }) => {
    const updated = await runTodoMutation(id, () =>
      updateTodoStatusMutation({ data: { id, status } }),
    )
    if (!updated) return

    const finishesDay =
      status === "done" &&
      todos.some((todo) => todo.id === id && todo.status !== "done") &&
      todos.every((todo) => todo.id === id || todo.status === "done")

    localDataVersion.current += 1
    setTodoItems((current) => reconcileTodos(current, { type: "upsert", todo: updated }))

    if (finishesDay) {
      play("complete")
      void confetti({
        colors: ["#5d9968", "#d9a441", "#d36c5f", "#7698b3", "#9b78ad"],
        disableForReducedMotion: true,
        gravity: 0.85,
        origin,
        particleCount: 60,
        scalar: 0.8,
        spread: 70,
        startVelocity: 26,
        ticks: 120,
      })
    } else {
      play(status === "done" ? "success" : "off")
    }
  }

  const removeTodo = async (id: string) => {
    const removed = await runTodoMutation(id, () => deleteTodoMutation({ data: { id } }))
    if (!removed) return

    localDataVersion.current += 1
    setTodoItems((current) => reconcileTodos(current, { type: "remove", id: removed.id }))
    play("drop")
  }

  const postpone = async (id: string) => {
    const todo = todoItems.find((candidate) => candidate.id === id)
    if (!todo) return

    const scheduledDate = shiftDateKey(todo.scheduledDate, 1)
    const updated = await runTodoMutation(id, () =>
      rescheduleTodoMutation({ data: { id, scheduledDate } }),
    )
    if (!updated) return

    localDataVersion.current += 1
    setTodoItems((current) => reconcileTodos(current, { type: "upsert", todo: updated }))
    play("swoosh")
  }

  const saveDetails = async (
    id: string,
    details: { text: string; body: string | null },
  ) => {
    const updated = await runTodoMutation(id, () =>
      saveTodoDetailsMutation({ data: { id, ...details } }),
    )
    if (!updated) return false

    localDataVersion.current += 1
    setTodoItems((current) => reconcileTodos(current, { type: "upsert", todo: updated }))
    return true
  }

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || createInFlight.current || acceptOverdueInFlight.current) return

    createInFlight.current = true
    setIsCreating(true)
    setError(null)
    try {
      const todo = await createTodoMutation({ data: { text, scheduledDate: key } })
      localDataVersion.current += 1
      setTodoItems((current) => reconcileTodos(current, { type: "upsert", todo }))
      setDraft("")
    } catch {
      setError("That todo could not be added. Try again.")
      play("error")
    } finally {
      createInFlight.current = false
      setIsCreating(false)
    }
  }

  const acceptAllOverdue = async () => {
    if (
      acceptOverdueInFlight.current ||
      createInFlight.current ||
      pendingTodoIdsRef.current.size > 0
    ) return

    acceptOverdueInFlight.current = true
    setIsAcceptingOverdue(true)
    setError(null)

    try {
      const acceptedTodos = await acceptOverdueTodosMutation({
        data: { scheduledDate: todayKey },
      })
      localDataVersion.current += 1
      setTodoItems((current) =>
        reconcileTodos(current, { type: "upsert-many", todos: acceptedTodos }),
      )
      play("success")
    } catch {
      setError("Those tasks could not be moved to today. Try again.")
      play("error")
    } finally {
      acceptOverdueInFlight.current = false
      setIsAcceptingOverdue(false)
    }
  }

  const relative =
    offset === 0 ? "Today" : offset === -1 ? "Yesterday" : offset === 1 ? "Tomorrow" : viewed.toLocaleDateString(undefined, { weekday: "long" })

  const fullDate = viewed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  })

  const changeDayFromSwipe = (event: { target: EventTarget | null }, change: number) => {
    const target = event.target
    if (!(target instanceof Element) || target.closest("button, input, a, li")) return

    setOffset((current) => current + change)
    play("swoosh")
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft: ({ event }) => changeDayFromSwipe(event, 1),
    onSwipedRight: ({ event }) => changeDayFromSwipe(event, -1),
    delta: 48,
    trackMouse: false,
    preventScrollOnSwipe: false,
  })

  return (
    <section {...swipeHandlers} className="min-h-[calc(100dvh-4rem)] w-full max-w-xl sm:min-h-0">
      <header className="mb-4 sm:mb-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">{relative}</p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="quiet"
              size="icon"
              sound="swoosh"
              onClick={() => setOffset((current) => current - 1)}
              aria-label="Previous day"
              className="rounded-md"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="icon"
              sound="swoosh"
              onClick={() => setOffset((current) => current + 1)}
              aria-label="Next day"
              className="rounded-md"
            >
              <ChevronRight className="size-5" />
            </Button>
            <Separator
              aria-hidden="true"
              orientation="vertical"
              className="mx-1 data-vertical:h-4 data-vertical:self-auto"
            />
            <AppMenu />
          </div>
        </div>
        <h1 className="mt-1 font-hand text-3xl leading-tight text-foreground sm:mt-2 sm:text-5xl">{fullDate}</h1>
      </header>

      <AnimatePresence initial={false}>
        {offset === 0 && overdueTodos.length > 0 && (
          <motion.div
            key="overdue-todos"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Card size="sm" className="mb-5 gap-3">
              <CardHeader>
                <CardTitle>From earlier</CardTitle>
                <CardDescription>
                  {overdueTodos.length} unfinished {overdueTodos.length === 1 ? "task" : "tasks"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border/60 border-y border-border/60">
                  {overdueTodos.map((todo) => (
                    <li key={todo.id} className="py-2 font-hand text-lg leading-relaxed">
                      {todo.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="gap-2">
                <Link
                  to="/cleanup"
                  data-foley-click="swoosh"
                  aria-disabled={isAcceptingOverdue}
                  tabIndex={isAcceptingOverdue ? -1 : undefined}
                  onClick={(event) => {
                    if (acceptOverdueInFlight.current) event.preventDefault()
                  }}
                  className={cn(
                    buttonVariants({ variant: "outline", className: "flex-1" }),
                    isAcceptingOverdue && "pointer-events-none opacity-50",
                  )}
                >
                  <ListChecks data-icon="inline-start" />
                  Review
                </Link>
                <Button
                  type="button"
                  sound={false}
                  disabled={isAcceptingOverdue || isCreating || pendingTodoIds.size > 0}
                  onClick={() => void acceptAllOverdue()}
                  className="flex-1"
                >
                  <CheckCheck data-icon="inline-start" />
                  {isAcceptingOverdue ? "Accepting…" : "Accept all"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <ul key={key} className="divide-y divide-border/60">
        <AnimatePresence initial={false} mode="popLayout">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              pending={isAcceptingOverdue || pendingTodoIds.has(todo.id)}
              onOpenDetails={setSelectedTodoId}
              onSetStatus={setStatus}
              onPostpone={postpone}
              onDelete={removeTodo}
            />
          ))}
        </AnimatePresence>
      </ul>

      <form onSubmit={addTodo} className="flex items-center gap-3 border-t border-border/60 py-2.5 sm:gap-4 sm:py-3">
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground sm:size-6">
          <Plus className="size-4 sm:size-[1.125rem]" />
        </span>
        <Input
          variant="plain"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={offset === 0 ? "Add something for today…" : "Add something…"}
          aria-label="Add a new todo"
          disabled={isCreating || isAcceptingOverdue}
          className="min-w-0 flex-1 bg-transparent font-hand text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none sm:text-xl"
        />
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {selectedTodo && (
        <TodoDetailsDialog
          key={selectedTodo.id}
          todo={selectedTodo}
          onClose={() => setSelectedTodoId(null)}
          onSave={(details) => saveDetails(selectedTodo.id, details)}
        />
      )}
    </section>
  )
}
