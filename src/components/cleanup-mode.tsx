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
import { useCallback, useEffect, useRef, useState } from 'react'

import { AppMenu } from '@/components/app-menu'
import { Button, buttonVariants } from '@/components/ui/button'
import { deferTodo, deleteTodo } from '@/data/todos'
import type { Todo } from '@/db/schema'

const SWIPE_DISTANCE = 140
const SWIPE_VELOCITY = 900

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function tomorrowKey() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 1)

  return dateKey(date)
}

function CleanupCard({
  todo,
  isActing,
  isInputLocked,
  exitDirection,
  onReady,
  onDragEnd,
}: {
  todo: Todo
  isActing: boolean
  isInputLocked: boolean
  exitDirection: -1 | 1
  onReady: () => void
  onDragEnd: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => -1 | 1 | null
}) {
  const cardRef = useRef<HTMLElement | null>(null)
  const committed = useRef(false)
  const exitTarget = useRef(0)
  const x = useMotionValue(0)
  const shouldReduceMotion = useReducedMotion()
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10])
  const deleteOpacity = useTransform(x, [-100, -28, 0], [1, 0.25, 0])
  const tomorrowOpacity = useTransform(x, [0, 28, 100], [0, 0.25, 1])

  const commitToEdge = useCallback(
    (direction: -1 | 1) => {
      if (committed.current || !cardRef.current) return

      committed.current = true
      const bounds = cardRef.current.getBoundingClientRect()
      const currentX = x.get()
      const beyondViewport =
        direction === 1
          ? currentX + window.innerWidth - bounds.left + 32
          : currentX - bounds.right - 32

      exitTarget.current =
        direction === 1
          ? Math.max(beyondViewport, currentX + 32)
          : Math.min(beyondViewport, currentX - 32)

      if (shouldReduceMotion) {
        x.set(exitTarget.current)
      } else {
        void animate(x, exitTarget.current, { duration: 0.18, ease: 'easeOut' })
      }
    },
    [shouldReduceMotion, x],
  )

  useEffect(() => {
    if (isActing) {
      commitToEdge(exitDirection)
      return
    }

    if (!committed.current) return

    committed.current = false
    exitTarget.current = 0
    if (shouldReduceMotion) {
      x.set(0)
      onReady()
    } else {
      void animate(x, 0, { duration: 0.16, ease: 'easeOut' }).then(onReady)
    }
  }, [commitToEdge, exitDirection, isActing, onReady, shouldReduceMotion, x])

  const finishDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const direction = onDragEnd(event, info)
    if (direction) commitToEdge(direction)
  }

  return (
    <motion.article
      ref={cardRef}
      aria-busy={isActing}
      variants={{
        exit: () => ({
          opacity: 0,
          x: exitTarget.current,
        }),
      }}
      drag={isInputLocked ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragEnd={finishDrag}
      onAnimationComplete={() => {
        if (!isActing && !committed.current) onReady()
      }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit="exit"
      transition={{ duration: 0.16, ease: 'easeOut' }}
      whileDrag={{ scale: 1.01 }}
      style={{ x, rotate }}
      className="relative flex aspect-square cursor-grab touch-pan-y items-center justify-center rounded-2xl bg-card p-8 text-center shadow-card ring-1 ring-foreground/10 active:cursor-grabbing sm:p-10"
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
        style={{ opacity: tomorrowOpacity }}
        className="absolute top-4 left-4 -rotate-6 rounded-md border-2 border-postponed px-2 py-1 text-xs font-semibold tracking-[0.12em] text-postponed uppercase"
      >
        Tomorrow
      </motion.span>
      <p className="font-hand text-3xl leading-snug text-foreground sm:text-4xl">{todo.text}</p>
    </motion.article>
  )
}

export function CleanupMode({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[] | null>(null)
  const [exitDirection, setExitDirection] = useState<-1 | 1>(1)
  const [error, setError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [isInputLocked, setIsInputLocked] = useState(true)
  const pending = useRef(true)
  const deleteTodoMutation = useServerFn(deleteTodo)
  const deferTodoMutation = useServerFn(deferTodo)
  const current = todos?.[0]

  useEffect(() => {
    const today = dateKey(new Date())
    const eligible = initialTodos.filter(
      (todo) => todo.status !== 'done' && todo.scheduledDate <= today,
    )

    pending.current = eligible.length > 0
    setIsInputLocked(eligible.length > 0)
    setTodos(eligible)
  }, [initialTodos])

  const markCardReady = useCallback(() => {
    pending.current = false
    setIsInputLocked(false)
  }, [])

  const actOnCurrent = useCallback(
    async (direction: -1 | 1) => {
      if (!current || pending.current) return

      pending.current = true
      setExitDirection(direction)
      setIsInputLocked(true)
      setIsActing(true)
      setError(null)

      try {
        if (direction === -1) {
          await deleteTodoMutation({ data: { id: current.id } })
          play('drop')
        } else {
          await deferTodoMutation({ data: { id: current.id, scheduledDate: tomorrowKey() } })
          play('swoosh')
        }

        setTodos((remaining) =>
          remaining ? remaining.filter((todo) => todo.id !== current.id) : remaining,
        )
      } catch {
        setError('That task could not be updated. Try again.')
        play('error')
        setIsActing(false)
      }
    },
    [current, deferTodoMutation, deleteTodoMutation],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      if (event.target instanceof HTMLElement && event.target.closest('[role="menu"], [role="menuitem"]')) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

      event.preventDefault()
      void actOnCurrent(event.key === 'ArrowLeft' ? -1 : 1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [actOnCurrent])

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const crossesDistance = Math.abs(info.offset.x) >= SWIPE_DISTANCE
    const crossesVelocity = Math.abs(info.velocity.x) >= SWIPE_VELOCITY
    if (!crossesDistance && !crossesVelocity) return null

    const direction = (crossesDistance ? info.offset.x : info.velocity.x) < 0 ? -1 : 1
    void actOnCurrent(direction)
    return direction
  }

  return (
    <section className="flex min-h-[calc(100dvh-4rem)] w-full max-w-xl flex-col sm:min-h-[calc(100vh-8rem)]">
      <header className="flex items-center justify-between">
        <Link
          to="/"
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
            {todos?.length} {todos?.length === 1 ? 'task' : 'tasks'} left
          </p>
        )}
      </div>

      <div className="mt-8 sm:mt-10">
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
            <AnimatePresence
              mode="wait"
              initial={false}
              onExitComplete={() => {
                setIsActing(false)
                if (!current) markCardReady()
              }}
            >
              {todos === null ? (
                <div
                  key="loading"
                  role="status"
                  className="flex aspect-square items-center justify-center text-sm text-muted-foreground"
                >
                  Loading tasks…
                </div>
              ) : current ? (
                <CleanupCard
                  key={current.id}
                  todo={current}
                  isActing={isActing}
                  isInputLocked={isInputLocked}
                  exitDirection={exitDirection}
                  onReady={markCardReady}
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
                aria-label="Move this task to tomorrow"
                className="rounded-md hover:text-postponed"
              >
                <ArrowRight className="size-5" strokeWidth={2.5} />
              </Button>
            )}
          </div>
        </div>

        {current && (
          <>
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
                aria-label="Move this task to tomorrow"
                className="rounded-md hover:text-postponed"
              >
                <ArrowRight className="size-5" strokeWidth={2.5} />
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground sm:hidden">
              Swipe left to delete · right for tomorrow
            </p>
            <p className="mt-4 hidden text-center text-xs text-muted-foreground sm:block">
              Use ← and →
            </p>
          </>
        )}

        {error && (
          <p role="alert" className="mt-5 text-center text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
