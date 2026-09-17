import { play } from '@foleyjs/react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react'
import {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { flushSync } from 'react-dom'

import { AppMenu } from '@/components/app-menu'
import { Button, buttonVariants } from '@/components/ui/button'
import { deleteTodo, rescheduleTodo } from '@/data/todos'
import type { Todo } from '@/db/schema'
import { getOverdueTodos, localDateKey } from '@/domain/todos'

const SWIPE_DISTANCE = 140
const SWIPE_VELOCITY = 900

type Direction = -1 | 1
type AnimatedPhase = 'entering' | 'recovering'
type Interaction =
  | { phase: 'entering' }
  | { phase: 'ready' }
  | { phase: 'committing'; direction: Direction }
  | { phase: 'recovering' }
  | { phase: 'complete' }

type CleanupState = {
  todos: Todo[]
  interaction: Interaction
  error: string | null
}

type CleanupAction =
  | { type: 'reset'; todos: Todo[] }
  | { type: 'animation-finished'; phase: AnimatedPhase }
  | { type: 'commit'; direction: Direction }
  | { type: 'commit-succeeded'; todoId: string }
  | { type: 'commit-failed' }

function eligibleTodos(todos: Todo[]) {
  return getOverdueTodos(todos, localDateKey(new Date()))
}

function initialCleanupState(initialTodos: Todo[]): CleanupState {
  const todos = eligibleTodos(initialTodos)
  return {
    todos,
    interaction: todos.length > 0 ? { phase: 'entering' } : { phase: 'complete' },
    error: null,
  }
}

function cleanupReducer(state: CleanupState, action: CleanupAction): CleanupState {
  switch (action.type) {
    case 'reset':
      return initialCleanupState(action.todos)
    case 'animation-finished':
      if (state.interaction.phase !== action.phase) return state
      return { ...state, interaction: { phase: 'ready' } }
    case 'commit':
      if (state.interaction.phase !== 'ready' || state.todos.length === 0) return state
      return {
        ...state,
        interaction: { phase: 'committing', direction: action.direction },
        error: null,
      }
    case 'commit-succeeded': {
      if (state.interaction.phase !== 'committing') return state
      const todos = state.todos.filter((todo) => todo.id !== action.todoId)
      return {
        todos,
        interaction: todos.length > 0 ? { phase: 'entering' } : { phase: 'complete' },
        error: null,
      }
    }
    case 'commit-failed':
      if (state.interaction.phase !== 'committing') return state
      return {
        ...state,
        interaction: { phase: 'recovering' },
        error: 'That task could not be updated. Try again.',
      }
  }
}

function CleanupCard({
  todo,
  interaction,
  instructionsId,
  onAnimationFinished,
  onAction,
  onDragEnd,
}: {
  todo: Todo
  interaction: Interaction
  instructionsId: string
  onAnimationFinished: (phase: AnimatedPhase) => void
  onAction: (direction: Direction) => void
  onDragEnd: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => void
}) {
  const cardRef = useRef<HTMLElement | null>(null)
  const x = useMotionValue(0)
  const shouldReduceMotion = useReducedMotion()
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10])
  const deleteOpacity = useTransform(x, [-100, -28, 0], [1, 0.25, 0])
  const todayOpacity = useTransform(x, [0, 28, 100], [0, 0.25, 1])

  useEffect(() => {
    if (interaction.phase === 'entering') cardRef.current?.focus()
  }, [interaction.phase])

  useEffect(() => {
    if (interaction.phase === 'committing') {
      if (shouldReduceMotion) return

      const target = interaction.direction * (window.innerWidth + 32)
      const animation = animate(x, target, { duration: 0.18, ease: 'easeOut' })
      return () => animation.stop()
    }

    if (interaction.phase !== 'recovering') return

    if (shouldReduceMotion) {
      x.set(0)
      onAnimationFinished('recovering')
      return
    }

    let cancelled = false
    const animation = animate(x, 0, { duration: 0.16, ease: 'easeOut' })
    void animation.then(() => {
      if (!cancelled) onAnimationFinished('recovering')
    })

    return () => {
      cancelled = true
      animation.stop()
    }
  }, [interaction, onAnimationFinished, shouldReduceMotion, x])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    onAction(event.key === 'ArrowLeft' ? -1 : 1)
  }

  return (
    <motion.article
      ref={cardRef}
      tabIndex={0}
      aria-busy={interaction.phase === 'committing'}
      aria-describedby={instructionsId}
      aria-keyshortcuts="ArrowLeft ArrowRight"
      drag={interaction.phase === 'ready' ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragEnd={onDragEnd}
      onKeyDown={handleKeyDown}
      onAnimationComplete={() => {
        if (interaction.phase === 'entering') onAnimationFinished('entering')
      }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      whileDrag={{ scale: 1.01 }}
      style={{ x, rotate }}
      className="relative flex aspect-square cursor-grab touch-pan-y items-center justify-center rounded-2xl bg-card p-8 text-center shadow-card ring-1 ring-foreground/10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing sm:p-10"
    >
      <motion.span
        aria-hidden="true"
        style={{ opacity: deleteOpacity }}
        className="absolute top-4 right-4 rotate-6 rounded-md border-2 border-destructive px-2 py-1 text-xs font-semibold tracking-[0.12em] text-destructive uppercase"
      >
        Delete
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: todayOpacity }}
        className="absolute top-4 left-4 -rotate-6 rounded-md border-2 border-postponed px-2 py-1 text-xs font-semibold tracking-[0.12em] text-postponed uppercase"
      >
        Today
      </motion.span>
      <p className="font-hand text-3xl leading-snug text-foreground sm:text-4xl">{todo.text}</p>
    </motion.article>
  )
}

export function CleanupMode({ initialTodos }: { initialTodos: Todo[] }) {
  const [state, dispatch] = useReducer(cleanupReducer, initialTodos, initialCleanupState)
  const instructionsId = useId()
  const deleteTodoMutation = useServerFn(deleteTodo)
  const rescheduleTodoMutation = useServerFn(rescheduleTodo)
  const current = state.todos[0]
  const isInputLocked = state.interaction.phase !== 'ready'

  useEffect(() => {
    dispatch({ type: 'reset', todos: initialTodos })
  }, [initialTodos])

  const handleAnimationFinished = useCallback((phase: AnimatedPhase) => {
    dispatch({ type: 'animation-finished', phase })
  }, [])

  const actOnCurrent = useCallback(
    async (direction: Direction) => {
      if (!current || state.interaction.phase !== 'ready') return

      flushSync(() => dispatch({ type: 'commit', direction }))

      try {
        if (direction === -1) {
          await deleteTodoMutation({ data: { id: current.id } })
          play('drop')
        } else {
          await rescheduleTodoMutation({
            data: { id: current.id, scheduledDate: localDateKey(new Date()) },
          })
          play('swoosh')
        }

        dispatch({ type: 'commit-succeeded', todoId: current.id })
      } catch {
        play('error')
        dispatch({ type: 'commit-failed' })
      }
    },
    [current, deleteTodoMutation, rescheduleTodoMutation, state.interaction.phase],
  )

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const crossesDistance = Math.abs(info.offset.x) >= SWIPE_DISTANCE
    const crossesVelocity = Math.abs(info.velocity.x) >= SWIPE_VELOCITY
    if (!crossesDistance && !crossesVelocity) return

    const direction = (crossesDistance ? info.offset.x : info.velocity.x) < 0 ? -1 : 1
    void actOnCurrent(direction)
  }

  return (
    <section className="flex min-h-[calc(100dvh-4rem)] w-full max-w-xl flex-col sm:min-h-[calc(100vh-8rem)]">
      <header className="flex items-center justify-between">
        <Link
          to="/"
          reloadDocument
          aria-label="Back to main list"
          data-foley-click="swoosh"
          className={buttonVariants({
            variant: 'quiet',
            size: 'icon',
            className: 'rounded-md',
          })}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <AppMenu />
      </header>

      <div className="mt-8 text-center sm:mt-10">
        <h1 className="font-hand text-4xl leading-tight sm:text-5xl">Clean up</h1>
        {current && (
          <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
            {state.todos.length} {state.todos.length === 1 ? 'task' : 'tasks'} left
          </p>
        )}
      </div>

      <div className="mt-3">
        {current && (
          <p className="mb-3 hidden text-center text-xs text-muted-foreground sm:block">
            Focused card: ← delete · → today
          </p>
        )}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden w-9 shrink-0 justify-center sm:flex">
            {current && (
              <Button
                type="button"
                variant="quiet"
                size="icon-lg"
                sound={false}
                disabled={isInputLocked}
                onClick={() => void actOnCurrent(-1)}
                aria-label="Delete this task"
                className="rounded-md hover:text-destructive"
              >
                <X className="size-5" strokeWidth={2.5} />
              </Button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {current ? (
                <CleanupCard
                  key={current.id}
                  todo={current}
                  interaction={state.interaction}
                  instructionsId={instructionsId}
                  onAnimationFinished={handleAnimationFinished}
                  onAction={(direction) => void actOnCurrent(direction)}
                  onDragEnd={handleDragEnd}
                />
              ) : (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="text-center"
                >
                  <h2 className="font-hand text-3xl leading-tight sm:text-4xl">All cleaned up</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Nothing left to review.</p>
                  <Link
                    to="/"
                    reloadDocument
                    data-foley-click="swoosh"
                    className={buttonVariants({ className: 'mt-6' })}
                  >
                    Back to Today
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden w-9 shrink-0 justify-center sm:flex">
            {current && (
              <Button
                type="button"
                variant="quiet"
                size="icon-lg"
                sound={false}
                disabled={isInputLocked}
                onClick={() => void actOnCurrent(1)}
                aria-label="Move this task to today"
                className="rounded-md hover:text-postponed"
              >
                <ArrowRight className="size-5" strokeWidth={2.5} />
              </Button>
            )}
          </div>
        </div>

        {current && (
          <>
            <p id={instructionsId} className="sr-only">
              With this task card focused, press Left Arrow to delete it or Right Arrow to move it
              to today.
            </p>
            <div className="mt-5 flex items-center justify-center gap-8 sm:hidden">
              <Button
                type="button"
                variant="quiet"
                size="icon-lg"
                sound={false}
                disabled={isInputLocked}
                onClick={() => void actOnCurrent(-1)}
                aria-label="Delete this task"
                className="rounded-md hover:text-destructive"
              >
                <X className="size-5" strokeWidth={2.5} />
              </Button>
              <Button
                type="button"
                variant="quiet"
                size="icon-lg"
                sound={false}
                disabled={isInputLocked}
                onClick={() => void actOnCurrent(1)}
                aria-label="Move this task to today"
                className="rounded-md hover:text-postponed"
              >
                <ArrowRight className="size-5" strokeWidth={2.5} />
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground sm:hidden">
              Swipe left to delete · right for today
            </p>
          </>
        )}

        {state.error && (
          <p role="alert" className="mt-5 text-center text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </section>
  )
}
